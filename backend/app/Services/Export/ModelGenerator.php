<?php

namespace App\Services\Export;

/** Generates real Eloquent model files for a set of exported tables, with $fillable/$casts and belongsTo/hasMany relations inferred from FKs within the exported set. */
class ModelGenerator
{
    private const SYSTEM_COLUMNS = ['id', 'created_at', 'updated_at', 'deleted_at'];

    public function __construct(private SchemaIntrospector $introspector) {}

    /** @return array<string, string> filename => contents */
    public function generate(array $tableNames): array
    {
        $files = [];
        foreach ($tableNames as $table) {
            $class = NameResolver::modelClass($table);
            $files["app/Models/{$class}.php"] = $this->renderModel($table, $class, $tableNames);
        }

        return $files;
    }

    private function renderModel(string $table, string $class, array $allTables): string
    {
        $columns = $this->introspector->columns($table);
        $columnNames = array_column($columns, 'name');
        $hasSoftDeletes = in_array('deleted_at', $columnNames, true);

        $fillable = implode(', ', array_map(
            fn ($name) => "'{$name}'",
            array_values(array_diff($columnNames, self::SYSTEM_COLUMNS))
        ));

        $casts = [];
        foreach ($columns as $column) {
            $type = strtolower($column['type']);
            if (in_array($column['name'], self::SYSTEM_COLUMNS, true)) {
                continue;
            }
            if (str_starts_with($type, 'tinyint(1)')) {
                $casts[] = "'{$column['name']}' => 'boolean'";
            } elseif ($type === 'json') {
                $casts[] = "'{$column['name']}' => 'array'";
            } elseif (str_starts_with($type, 'decimal')) {
                $casts[] = "'{$column['name']}' => 'decimal:2'";
            }
        }
        $castsBlock = $casts ? "\n    protected \$casts = [".implode(', ', $casts)."];\n" : '';

        $relations = [];
        foreach ($this->introspector->foreignKeys($table) as $fk) {
            if (! in_array($fk['referenced_table'], $allTables, true)) {
                continue; // referenced table isn't part of this export — skip the relation, keep the plain column
            }
            $relatedClass = NameResolver::modelClass($fk['referenced_table']);
            $method = NameResolver::belongsToMethod($fk['column']);
            $relations[] = <<<PHP

    public function {$method}(): BelongsTo
    {
        return \$this->belongsTo({$relatedClass}::class, '{$fk['column']}');
    }
PHP;
        }

        foreach ($allTables as $otherTable) {
            if ($otherTable === $table) {
                continue;
            }
            foreach ($this->introspector->foreignKeys($otherTable) as $fk) {
                if ($fk['referenced_table'] !== $table) {
                    continue;
                }
                $otherClass = NameResolver::modelClass($otherTable);
                $method = NameResolver::hasManyMethod($otherTable);
                $relations[] = <<<PHP

    public function {$method}(): HasMany
    {
        return \$this->hasMany({$otherClass}::class, '{$fk['column']}');
    }
PHP;
            }
        }

        $relationsBlock = implode("\n", $relations);
        $softDeletesUse = $hasSoftDeletes ? "use Illuminate\\Database\\Eloquent\\SoftDeletes;\n" : '';
        $softDeletesTrait = $hasSoftDeletes ? '    use SoftDeletes;
'
            : '';
        $relationImports = $relations ? "use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;\nuse Illuminate\\Database\\Eloquent\\Relations\\HasMany;\n" : '';

        return <<<PHP
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
{$relationImports}{$softDeletesUse}
class {$class} extends Model
{
{$softDeletesTrait}    protected \$table = '{$table}';

    protected \$fillable = [{$fillable}];
{$castsBlock}{$relationsBlock}
}

PHP;
    }
}

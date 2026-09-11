<?php

namespace App\Services\Export;

/**
 * Generates real Laravel migration files for a set of live MySQL tables, reversing their actual
 * column/index/FK definitions (via SchemaIntrospector) into Schema::create() Blueprint calls.
 */
class MigrationGenerator
{
    public function __construct(private SchemaIntrospector $introspector) {}

    /**
     * @param  string[]  $tableNames
     * @return array<string, string> filename => file contents, in dependency (FK-safe) order
     */
    public function generate(array $tableNames): array
    {
        $ordered = $this->topologicalSort($tableNames);
        $files = [];
        $timestamp = now();

        foreach ($ordered as $i => $table) {
            $columns = $this->introspector->columns($table);
            $indexes = $this->introspector->indexes($table);
            $foreignKeys = array_filter($this->introspector->foreignKeys($table), fn ($fk) => in_array($fk['referenced_table'], $tableNames, true));

            $stamp = $timestamp->copy()->addSeconds($i)->format('Y_m_d_His');
            $className = 'Create'.str_replace(' ', '', ucwords(str_replace('_', ' ', $table))).'Table';
            $files["database/migrations/{$stamp}_create_{$table}_table.php"] = $this->renderMigration($table, $className, $columns, $indexes, $foreignKeys);
        }

        return $files;
    }

    /** Referenced tables migrate before the tables that reference them; falls back to input order on a cycle. */
    private function topologicalSort(array $tableNames): array
    {
        $edges = [];
        foreach ($tableNames as $table) {
            $edges[$table] = array_values(array_filter(
                array_column($this->introspector->foreignKeys($table), 'referenced_table'),
                fn ($ref) => $ref !== $table && in_array($ref, $tableNames, true)
            ));
        }

        $sorted = [];
        $visited = [];
        $visiting = [];

        $visit = function (string $table) use (&$visit, &$sorted, &$visited, &$visiting, $edges) {
            if (isset($visited[$table]) || isset($visiting[$table])) {
                return;
            }
            $visiting[$table] = true;
            foreach ($edges[$table] ?? [] as $dependency) {
                $visit($dependency);
            }
            unset($visiting[$table]);
            $visited[$table] = true;
            $sorted[] = $table;
        };

        foreach ($tableNames as $table) {
            $visit($table);
        }

        return $sorted;
    }

    private function renderMigration(string $table, string $className, array $columns, array $indexes, array $foreignKeys): string
    {
        $lines = [];
        $fkColumns = collect($foreignKeys)->keyBy('column');
        $uniqueSingleColumn = collect($indexes)->filter(fn ($ix) => $ix['unique'] && count($ix['columns']) === 1 && $ix['name'] !== 'PRIMARY')->pluck(null, 'columns.0');

        foreach ($columns as $column) {
            $name = $column['name'];
            if ($name === 'id' && ($column['key'] ?? null) === 'PRI') {
                $lines[] = '            $table->id();';

                continue;
            }
            if (in_array($name, ['created_at', 'updated_at'], true)) {
                continue; // handled by $table->timestamps() below
            }
            if ($name === 'deleted_at') {
                $lines[] = '            $table->softDeletes();';

                continue;
            }

            if ($fk = $fkColumns->get($name)) {
                $onDelete = match (strtoupper($fk['on_delete'])) {
                    'CASCADE' => '->cascadeOnDelete()',
                    'SET NULL' => '->nullOnDelete()',
                    'RESTRICT' => '->restrictOnDelete()',
                    default => '',
                };
                $call = "\$table->foreignId('{$name}')".($column['nullable'] ? '->nullable()' : '')."->constrained('{$fk['referenced_table']}', '{$fk['referenced_column']}'){$onDelete};";
            } else {
                $call = $this->blueprintCall($name, $column['type']);
                if ($column['nullable']) {
                    $call .= '->nullable()';
                }
                if ($column['default'] !== null) {
                    $call .= '->default('.$this->phpLiteral($column['default'], $column['type']).')';
                }
                if ($uniqueSingleColumn->has($name)) {
                    $call .= '->unique()';
                }
                $call .= ';';
            }
            $lines[] = '            '.$call;
        }

        if (collect($columns)->pluck('name')->intersect(['created_at', 'updated_at'])->count() === 2) {
            $lines[] = '            $table->timestamps();';
        }

        foreach ($indexes as $index) {
            if ($index['name'] === 'PRIMARY' || count($index['columns']) < 2) {
                continue; // single-column uniques are already inlined above
            }
            $cols = implode("', '", $index['columns']);
            $method = $index['unique'] ? 'unique' : 'index';
            $lines[] = "            \$table->{$method}(['{$cols}']);";
        }

        $body = implode("\n", $lines);

        return <<<PHP
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('{$table}', function (Blueprint \$table) {
{$body}
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('{$table}');
    }
};

PHP;
    }

    /** Reverses a MySQL column type string (from SHOW FULL COLUMNS) into a Schema Blueprint call, unqualified (no nullable/default/unique chaining). */
    private function blueprintCall(string $name, string $type): string
    {
        $type = strtolower($type);

        if (preg_match('/^varchar\((\d+)\)/', $type, $m)) {
            return "\$table->string('{$name}', {$m[1]})";
        }
        if (preg_match('/^char\((\d+)\)/', $type, $m)) {
            return $m[1] === '36' ? "\$table->uuid('{$name}')" : "\$table->char('{$name}', {$m[1]})";
        }
        if ($type === 'text') {
            return "\$table->text('{$name}')";
        }
        if ($type === 'mediumtext') {
            return "\$table->mediumText('{$name}')";
        }
        if ($type === 'longtext') {
            return "\$table->longText('{$name}')";
        }
        // MySQL 8.0.19+ omits the display width for integer types that didn't specify one explicitly
        // (e.g. plain "int" instead of "int(11)") — tinyint(1) is the one width MySQL always preserves,
        // since it's the de facto boolean convention, so it's matched first and separately.
        if (preg_match('/^tinyint\(1\)/', $type)) {
            return "\$table->boolean('{$name}')";
        }
        if (preg_match('/^bigint(\(\d+\))?(\s+unsigned)?/', $type, $m)) {
            return empty($m[2]) ? "\$table->bigInteger('{$name}')" : "\$table->unsignedBigInteger('{$name}')";
        }
        if (preg_match('/^int(\(\d+\))?(\s+unsigned)?/', $type, $m)) {
            return empty($m[2]) ? "\$table->integer('{$name}')" : "\$table->unsignedInteger('{$name}')";
        }
        if (preg_match('/^smallint(\(\d+\))?(\s+unsigned)?/', $type, $m)) {
            return empty($m[2]) ? "\$table->smallInteger('{$name}')" : "\$table->unsignedSmallInteger('{$name}')";
        }
        if (preg_match('/^tinyint(\(\d+\))?(\s+unsigned)?/', $type, $m)) {
            return empty($m[2]) ? "\$table->tinyInteger('{$name}')" : "\$table->unsignedTinyInteger('{$name}')";
        }
        if (preg_match('/^decimal\((\d+),(\d+)\)/', $type, $m)) {
            return "\$table->decimal('{$name}', {$m[1]}, {$m[2]})";
        }
        if ($type === 'float') {
            return "\$table->float('{$name}')";
        }
        if ($type === 'double') {
            return "\$table->double('{$name}')";
        }
        if ($type === 'date') {
            return "\$table->date('{$name}')";
        }
        if ($type === 'datetime') {
            return "\$table->dateTime('{$name}')";
        }
        if (str_starts_with($type, 'timestamp')) {
            return "\$table->timestamp('{$name}')";
        }
        if ($type === 'time') {
            return "\$table->time('{$name}')";
        }
        if (str_starts_with($type, 'year')) {
            return "\$table->unsignedSmallInteger('{$name}') /* year */";
        }
        if ($type === 'json') {
            return "\$table->json('{$name}')";
        }
        if ($type === 'blob' || str_ends_with($type, 'blob')) {
            return "\$table->binary('{$name}')";
        }
        if (preg_match('/^enum\\((.+)\\)$/', $type, $m)) {
            preg_match_all("/'((?:[^'\\\\]|\\\\.)*)'/", $m[1], $values);
            $list = implode(', ', array_map(fn ($v) => "'".addslashes(str_replace("''", "'", $v))."'", $values[1]));

            return "\$table->enum('{$name}', [{$list}])";
        }

        return "\$table->string('{$name}', 255) /* unmapped MySQL type: {$type} */";
    }

    private function phpLiteral(mixed $value, string $type): string
    {
        $type = strtolower($type);
        if (str_starts_with($type, 'tinyint(1)')) {
            return $value === '1' ? 'true' : 'false';
        }
        $numeric = (bool) preg_match('/^(bigint|int|smallint|tinyint|decimal|float|double)/', $type);
        if ($numeric && is_numeric($value)) {
            return (string) $value;
        }

        return "'".addslashes((string) $value)."'";
    }
}

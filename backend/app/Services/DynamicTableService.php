<?php

namespace App\Services;

use App\Models\BuilderField;
use App\Models\BuilderModule;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DynamicTableService
{
    public const PREFIX = 'nx_';
    public const DATA_TYPES = ['string','text','integer','decimal','boolean','date','datetime','relation'];
    public const INPUT_TYPES = ['text','textarea','number','email','date','datetime-local','checkbox','select','autocomplete','multiselect'];

    /** Map of logical types to SQL column definitions fragment. */
    public const SQL_TYPE_MAP = [
        'string' => 'VARCHAR(:length)',
        'text' => 'TEXT',
        'integer' => 'BIGINT',
        'decimal' => 'DECIMAL(15,2)',
        'boolean' => 'TINYINT(1)',
        'date' => 'DATE',
        'datetime' => 'DATETIME',
        'relation' => 'BIGINT UNSIGNED',
    ];

    public function safeTableName(string $name): string
    {
        $table = self::PREFIX.Str::snake(Str::pluralStudly($name));
        if (! preg_match('/^nx_[a-z][a-z0-9_]{1,54}$/', $table)) {
            throw ValidationException::withMessages(['name' => 'El nombre no puede convertirse en una tabla segura.']);
        }
        return $table;
    }

    public function safeColumnName(string $name): string
    {
        $column = Str::snake($name);
        if (! preg_match('/^[a-z][a-z0-9_]{1,54}$/', $column) || in_array($column, ['id','created_at','updated_at'], true)) {
            throw ValidationException::withMessages(['name' => 'Nombre de campo inválido o reservado.']);
        }
        return $column;
    }

    public function createTable(BuilderModule $module): void
    {
        Schema::create($module->table_name, function (Blueprint $table) {
            $table->id(); $table->timestamps();
        });
    }

    /** Raw DDL helpers — DDL implicitly commits in MySQL, so never wrap in DB::transaction. */

    public function addColumn(BuilderModule $module, BuilderField $field): void
    {
        Schema::table($module->table_name, function (Blueprint $table) use ($field, $module) {
            $column = match ($field->data_type) {
                'string' => $table->string($field->name, $field->length ?: 255),
                'text' => $table->text($field->name),
                'integer' => $table->bigInteger($field->name),
                'decimal' => $table->decimal($field->name, 15, 2),
                'boolean' => $table->boolean($field->name),
                'date' => $table->date($field->name),
                'datetime' => $table->dateTime($field->name),
                'relation' => $table->unsignedBigInteger($field->name),
                default => throw ValidationException::withMessages(['data_type' => 'Tipo de dato no permitido.']),
            };
            if ($field->nullable) $column->nullable();
            if ($field->unique) $column->unique();
            if ($field->default_value !== null && $field->default_value !== '') $column->default($this->castDefault($field));
            if ($field->data_type === 'relation') {
                $table->index($field->name);
                // Create FOREIGN KEY constraint if related_module_id is set
                if (!empty($field->related_module_id)) {
                    $relatedModule = BuilderModule::find($field->related_module_id);
                    if ($relatedModule && Schema::hasTable($relatedModule->table_name)) {
                        $fkName = "fk_{$module->table_name}_{$field->name}";
                        $table->foreign($field->name)->references('id')->on($relatedModule->table_name)->nullOnDelete();
                    }
                }
            }
        });
    }

    /** ALTER TABLE ... MODIFY — change type/nullability/default/unique for an existing column. */
    public function modifyColumn(string $table, string $column, array $physical): void
    {
        $definition = $this->columnDefinition($physical);
        $null = ($physical['nullable'] ?? true) ? 'NULL' : 'NOT NULL';
        $default = isset($physical['default_value']) && $physical['default_value'] !== ''
            ? 'DEFAULT '.$this->sqlQuote($physical['default_value'], $physical['data_type'] ?? 'string')
            : 'NULL';
        $after = isset($physical['after']) && $physical['after'] !== '' ? ' AFTER `'.$physical['after'].'`' : '';
        DB::statement("ALTER TABLE `{$table}` MODIFY `{$column}` {$definition} {$null} {$default}{$after}");
        if (! empty($physical['unique'])) {
            $indexName = $column.'_unique';
            $exists = collect(DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$indexName]))->isNotEmpty();
            if (! $exists) DB::statement("ALTER TABLE `{$table}` ADD UNIQUE KEY `{$indexName}` (`{$column}`)");
        }
    }

    public function renameColumn(string $table, string $from, string $to): void
    {
        DB::statement("ALTER TABLE `{$table}` RENAME COLUMN `{$from}` TO `{$to}`");
    }

    public function dropColumn(string $table, string $column): void
    {
        // Drop foreign key constraints first
        $fks = collect(DB::select("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL", [$table, $column]));
        foreach ($fks as $fk) {
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
        }
        // Drop related indexes (unique/index referencing the column) first.
        $indexes = collect(DB::select("SHOW INDEX FROM `{$table}` WHERE Column_name = ?", [$column]))
            ->pluck('Key_name')->unique()
            ->reject(fn ($name) => $name === 'PRIMARY');
        foreach ($indexes as $index) {
            DB::statement("ALTER TABLE `{$table}` DROP INDEX `{$index}`");
        }
        DB::statement("ALTER TABLE `{$table}` DROP COLUMN `{$column}`");
    }

    /** Add a foreign key constraint to an existing column. */
    public function addForeignKey(string $table, string $column, string $referencedTable, string $referencedColumn = 'id', string $onDelete = 'SET NULL'): void
    {
        $fkName = "fk_{$table}_{$column}";
        // Drop existing FK if any
        $exists = collect(DB::select("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL", [$table, $column]));
        foreach ($exists as $fk) {
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
        }
        $onDeleteSQL = match(strtoupper($onDelete)) {
            'CASCADE' => 'ON DELETE CASCADE',
            'RESTRICT' => 'ON DELETE RESTRICT',
            'NO ACTION' => 'ON DELETE NO ACTION',
            default => 'ON DELETE SET NULL',
        };
        DB::statement("ALTER TABLE `{$table}` ADD CONSTRAINT `{$fkName}` FOREIGN KEY (`{$column}`) REFERENCES `{$referencedTable}`(`{$referencedColumn}`) {$onDeleteSQL}");
    }

    /** Drop a foreign key constraint. */
    public function dropForeignKey(string $table, string $column): void
    {
        $fks = collect(DB::select("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL", [$table, $column]));
        foreach ($fks as $fk) {
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
        }
    }

    /** Add a column to any nx_ table without module metadata. */
    public function addColumnRaw(string $table, string $name, array $data): void
    {
        $definition = $this->columnDefinition($data);
        $null = ($data['nullable'] ?? true) ? 'NULL' : 'NOT NULL';
        $default = isset($data['default_value']) && $data['default_value'] !== ''
            ? 'DEFAULT '.$this->sqlQuote($data['default_value'], $data['data_type'] ?? 'string')
            : 'NULL';
        DB::statement("ALTER TABLE `{$table}` ADD `{$name}` {$definition} {$null} {$default}");
        if (! empty($data['unique'])) DB::statement("ALTER TABLE `{$table}` ADD UNIQUE KEY `{$name}_unique` (`{$name}`)");
    }

    public function columnDefinition(array $physical): string
    {
        $type = $physical['data_type'] ?? 'string';
        $template = self::SQL_TYPE_MAP[$type] ?? null;
        if ($template === null) throw ValidationException::withMessages(['data_type' => 'Tipo de dato no permitido.']);

        return str_replace(':length', (string) ($physical['length'] ?: 255), $template);
    }

    public function sqlQuote(mixed $value, string $type): string
    {
        $value = (string) $value;
        $safe = str_replace("'", "''", $value);
        $numeric = in_array($type, ['integer','decimal','boolean','relation'], true);

        return $numeric && is_numeric($value) ? (string) (float) $value : "'{$safe}'";
    }

    private function castDefault(BuilderField $field): mixed
    {
        return match ($field->data_type) {
            'integer' => (int) $field->default_value,
            'decimal' => (float) $field->default_value,
            'boolean' => filter_var($field->default_value, FILTER_VALIDATE_BOOL),
            default => $field->default_value,
        };
    }
}

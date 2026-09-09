<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Existing installations: preserve every reference before removing module metadata.
        if (Schema::hasTable('builder_permissions')) {
            if (! Schema::hasColumn('builder_permissions', 'table_name')) {
                Schema::table('builder_permissions', fn (Blueprint $table) => $table->string('table_name')->nullable()->after('role_id'));
            }

            if (Schema::hasColumn('builder_permissions', 'module_id')) {
                if (Schema::hasTable('builder_modules')) {
                    DB::statement('UPDATE builder_permissions p JOIN builder_modules m ON m.id = p.module_id SET p.table_name = m.table_name WHERE p.table_name IS NULL');
                }

                // MySQL may use the composite unique index to support role_id's FK.
                // Drop both constraints first, then the index and obsolete column.
                $this->dropForeignKeysForColumn('builder_permissions', 'role_id');
                $this->dropForeignKeysForColumn('builder_permissions', 'module_id');
                $this->dropIndexIfExists('builder_permissions', 'builder_permissions_role_id_module_id_unique');
                Schema::table('builder_permissions', fn (Blueprint $table) => $table->dropColumn('module_id'));
            }

            if (! $this->foreignKeyExists('builder_permissions', 'role_id')) {
                Schema::table('builder_permissions', fn (Blueprint $table) => $table->foreign('role_id')->references('id')->on('builder_roles')->cascadeOnDelete());
            }
            if (! $this->indexExists('builder_permissions', 'builder_permissions_role_id_table_name_unique')) {
                Schema::table('builder_permissions', fn (Blueprint $table) => $table->unique(['role_id', 'table_name']));
            }
        }

        if (Schema::hasTable('builder_charts')) {
            if (! Schema::hasColumn('builder_charts', 'table_name')) {
                Schema::table('builder_charts', fn (Blueprint $table) => $table->string('table_name')->nullable()->after('name'));
            }
            if (Schema::hasColumn('builder_charts', 'module_id')) {
                if (Schema::hasTable('builder_modules')) {
                    DB::statement('UPDATE builder_charts c JOIN builder_modules m ON m.id = c.module_id SET c.table_name = m.table_name WHERE c.table_name IS NULL');
                }
                $this->dropForeignKeysForColumn('builder_charts', 'module_id');
                Schema::table('builder_charts', fn (Blueprint $table) => $table->dropColumn('module_id'));
            }
        }

        if (Schema::hasTable('builder_menu_items')) {
            if (! Schema::hasColumn('builder_menu_items', 'target_table')) {
                Schema::table('builder_menu_items', fn (Blueprint $table) => $table->string('target_table')->nullable()->after('target_id'));
            }
            if (Schema::hasTable('builder_modules')) {
                DB::statement("UPDATE builder_menu_items i JOIN builder_modules m ON i.target_type = 'module' AND m.id = i.target_id SET i.target_type = 'table', i.target_table = m.table_name, i.target_id = NULL");
            }
        }

        Schema::dropIfExists('builder_fields');
        Schema::dropIfExists('builder_modules');
    }

    public function down(): void
    {
        // The removed module/form metadata cannot be reconstructed safely.
    }

    private function dropForeignKeysForColumn(string $table, string $column): void
    {
        $constraints = DB::select(
            'SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL',
            [$table, $column]
        );
        foreach ($constraints as $constraint) {
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$constraint->CONSTRAINT_NAME}`");
        }
    }

    private function foreignKeyExists(string $table, string $column): bool
    {
        return DB::selectOne(
            'SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1',
            [$table, $column]
        ) !== null;
    }

    private function indexExists(string $table, string $index): bool
    {
        return DB::selectOne(
            'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
            [$table, $index]
        ) !== null;
    }

    private function dropIndexIfExists(string $table, string $index): void
    {
        if ($this->indexExists($table, $index)) {
            DB::statement("ALTER TABLE `{$table}` DROP INDEX `{$index}`");
        }
    }
};

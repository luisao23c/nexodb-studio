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
        if (Schema::hasTable('builder_permissions') && Schema::hasColumn('builder_permissions', 'module_id')) {
            Schema::table('builder_permissions', fn (Blueprint $table) => $table->string('table_name')->nullable()->after('role_id'));
            DB::statement('UPDATE builder_permissions p JOIN builder_modules m ON m.id = p.module_id SET p.table_name = m.table_name');
            Schema::table('builder_permissions', function (Blueprint $table) {
                $table->dropUnique('builder_permissions_role_id_module_id_unique');
                $table->dropForeign(['module_id']);
                $table->dropColumn('module_id');
                $table->unique(['role_id', 'table_name']);
            });
        }

        if (Schema::hasTable('builder_charts') && Schema::hasColumn('builder_charts', 'module_id')) {
            Schema::table('builder_charts', fn (Blueprint $table) => $table->string('table_name')->nullable()->after('name'));
            DB::statement('UPDATE builder_charts c JOIN builder_modules m ON m.id = c.module_id SET c.table_name = m.table_name');
            Schema::table('builder_charts', function (Blueprint $table) {
                $table->dropForeign(['module_id']);
                $table->dropColumn('module_id');
            });
        }

        if (Schema::hasTable('builder_menu_items') && ! Schema::hasColumn('builder_menu_items', 'target_table')) {
            Schema::table('builder_menu_items', fn (Blueprint $table) => $table->string('target_table')->nullable()->after('target_id'));
            DB::statement("UPDATE builder_menu_items i JOIN builder_modules m ON i.target_type = 'module' AND m.id = i.target_id SET i.target_type = 'table', i.target_table = m.table_name, i.target_id = NULL");
        }

        Schema::dropIfExists('builder_fields');
        Schema::dropIfExists('builder_modules');
    }

    public function down(): void
    {
        // The removed module/form metadata cannot be reconstructed safely.
    }
};

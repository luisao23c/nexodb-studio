<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TABLES = ['nx_routes', 'builder_menus', 'builder_charts', 'builder_pages', 'builder_forms', 'builder_views'];

    public function up(): void
    {
        // 1. Add nullable project_id (no FK yet) to every scoped table.
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->unsignedBigInteger('project_id')->nullable()->after('id');
            });
        }

        // 2. Create the default project that every pre-existing row will belong to.
        //    Idempotent: a rollback of THIS migration doesn't remove the row (it belongs to
        //    the previous migration's table), so re-running must not try to insert a duplicate.
        DB::table('projects')->updateOrInsert(
            ['slug' => 'proyecto-principal'],
            ['name' => 'Proyecto principal', 'is_public' => false, 'active' => true, 'updated_at' => now(), 'created_at' => now()]
        );
        $defaultProjectId = DB::table('projects')->where('slug', 'proyecto-principal')->value('id');

        // 3. Backfill.
        foreach (self::TABLES as $table) {
            DB::table($table)->update(['project_id' => $defaultProjectId]);
        }

        // 4. nx_routes.parent_id is a self-referencing FK currently backed only by the
        //    (parent_id, slug) unique index we're about to drop — give it its own plain
        //    index first so MySQL doesn't refuse the drop ("needed in a foreign key constraint").
        Schema::table('nx_routes', fn (Blueprint $t) => $t->index('parent_id', 'nx_routes_parent_id_index'));

        // 5. Drop old unique indexes that must become project-scoped.
        Schema::table('nx_routes', fn (Blueprint $t) => $t->dropUnique(['parent_id', 'slug']));
        Schema::table('builder_menus', fn (Blueprint $t) => $t->dropUnique(['slug']));
        Schema::table('builder_pages', fn (Blueprint $t) => $t->dropUnique(['slug']));
        Schema::table('builder_forms', fn (Blueprint $t) => $t->dropUnique(['form_key']));
        Schema::table('builder_views', fn (Blueprint $t) => $t->dropUnique(['view_key']));

        // 6. Make project_id required now that every row has one (no doctrine/dbal installed, so raw DDL).
        foreach (self::TABLES as $table) {
            DB::statement("ALTER TABLE `{$table}` MODIFY `project_id` BIGINT UNSIGNED NOT NULL");
        }

        // 7. Add the FK + the new composite unique indexes.
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            });
        }
        Schema::table('nx_routes', fn (Blueprint $t) => $t->unique(['project_id', 'parent_id', 'slug']));
        Schema::table('builder_menus', fn (Blueprint $t) => $t->unique(['project_id', 'slug']));
        Schema::table('builder_pages', fn (Blueprint $t) => $t->unique(['project_id', 'slug']));
        Schema::table('builder_forms', fn (Blueprint $t) => $t->unique(['project_id', 'form_key']));
        Schema::table('builder_views', fn (Blueprint $t) => $t->unique(['project_id', 'view_key']));
    }

    public function down(): void
    {
        // Drop the project_id FKs first so the composite unique indexes below can be dropped freely.
        foreach (self::TABLES as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropForeign(['project_id']));
        }

        Schema::table('nx_routes', fn (Blueprint $t) => $t->dropUnique(['project_id', 'parent_id', 'slug']));
        Schema::table('builder_menus', fn (Blueprint $t) => $t->dropUnique(['project_id', 'slug']));
        Schema::table('builder_pages', fn (Blueprint $t) => $t->dropUnique(['project_id', 'slug']));
        Schema::table('builder_forms', fn (Blueprint $t) => $t->dropUnique(['project_id', 'form_key']));
        Schema::table('builder_views', fn (Blueprint $t) => $t->dropUnique(['project_id', 'view_key']));

        foreach (self::TABLES as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropColumn('project_id'));
        }

        // Restore the original unique first — it becomes the new supporting index for the
        // parent_id self-FK — THEN drop the temporary plain index, mirroring the up() order.
        Schema::table('nx_routes', fn (Blueprint $t) => $t->unique(['parent_id', 'slug']));
        Schema::table('nx_routes', fn (Blueprint $t) => $t->dropIndex('nx_routes_parent_id_index'));

        Schema::table('builder_menus', fn (Blueprint $t) => $t->unique(['slug']));
        Schema::table('builder_pages', fn (Blueprint $t) => $t->unique(['slug']));
        Schema::table('builder_forms', fn (Blueprint $t) => $t->unique(['form_key']));
        Schema::table('builder_views', fn (Blueprint $t) => $t->unique(['view_key']));
    }
};

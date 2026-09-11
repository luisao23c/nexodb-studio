<?php

namespace Tests\Feature\Export;

use App\Models\Project;
use App\Services\Export\MigrationGenerator;
use App\Services\Export\ProjectReferenceAnalyzer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MigrationGeneratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_analyzer_collects_tables_referenced_by_forms_views_and_charts(): void
    {
        $project = Project::create(['name' => 'Tienda', 'slug' => 'tienda']);
        $project->forms()->create(['name' => 'F', 'form_key' => 'f1', 'table_name' => 'nx_clientes', 'layout_columns' => 2, 'submit_label' => 'Guardar']);
        $project->views()->create(['name' => 'V', 'view_key' => 'v1', 'table_name' => 'nx_productos', 'primary_key' => 'id', 'default_sort_direction' => 'desc', 'per_page' => 20]);

        $set = app(ProjectReferenceAnalyzer::class)->analyze($project);

        $this->assertContains('nx_clientes', $set->tableNames);
        $this->assertContains('nx_productos', $set->tableNames);
    }

    public function test_analyzer_collects_table_names_from_list_components_in_routes(): void
    {
        $project = Project::create(['name' => 'Tienda', 'slug' => 'tienda']);
        $project->routes()->create([
            'name' => 'Inicio', 'slug' => 'inicio', 'content_type' => 'empty',
            'content_config' => ['components' => [
                ['id' => 'c1', 'type' => 'list', 'label' => 'Lista', 'config' => ['table_name' => 'nx_proveedores']],
                ['id' => 'c2', 'type' => 'columns', 'label' => 'Columnas', 'config' => ['columns' => 2, 'children' => [
                    [['id' => 'c3', 'type' => 'table_detail', 'label' => 'Detalle', 'config' => ['table_name' => 'nx_ordenes']]],
                    [],
                ]]],
            ]],
        ]);

        $set = app(ProjectReferenceAnalyzer::class)->analyze($project);

        $this->assertContains('nx_proveedores', $set->tableNames);
        $this->assertContains('nx_ordenes', $set->tableNames);
    }

    public function test_generated_migrations_are_valid_and_runnable_against_a_scratch_schema(): void
    {
        $project = Project::create(['name' => 'Tienda', 'slug' => 'tienda']);
        $project->views()->create(['name' => 'V', 'view_key' => 'v1', 'table_name' => 'nx_productos', 'primary_key' => 'id', 'default_sort_direction' => 'desc', 'per_page' => 20]);

        $set = app(ProjectReferenceAnalyzer::class)->analyze($project);
        // nx_productos has FKs to nx_categorias and nx_proveedores — the analyzer only saw nx_productos,
        // so the generator must silently drop the out-of-set FKs rather than emit a broken migration.
        $files = app(MigrationGenerator::class)->generate($set->tableNames);

        $this->assertNotEmpty($files);
        foreach ($files as $path => $contents) {
            $tmp = tempnam(sys_get_temp_dir(), 'mig').'.php';
            file_put_contents($tmp, $contents);
            $result = shell_exec('php -l '.escapeshellarg($tmp).' 2>&1');
            $this->assertStringContainsString('No syntax errors detected', (string) $result, "Generated migration invalid: {$path}\n{$contents}");
            unlink($tmp);
        }

        // Run the generated migration for real against a disposable table name to prove the Blueprint calls work.
        $scratchTable = 'zz_export_test_'.uniqid();
        $sql = array_values($files)[0];
        $sql = str_replace('nx_productos', $scratchTable, $sql);
        $tmpMigration = sys_get_temp_dir().'/'.uniqid('export_test_').'.php';
        file_put_contents($tmpMigration, $sql);

        try {
            $migration = require $tmpMigration;
            $migration->up();
            $this->assertTrue(Schema::hasTable($scratchTable));
            $migration->down();
            $this->assertFalse(Schema::hasTable($scratchTable));
        } finally {
            DB::statement("DROP TABLE IF EXISTS `{$scratchTable}`");
            unlink($tmpMigration);
        }
    }

    public function test_foreign_keys_are_ordered_and_wired_only_within_the_exported_set(): void
    {
        $files = app(MigrationGenerator::class)->generate(['nx_productos', 'nx_categorias', 'nx_proveedores']);
        $paths = array_values(array_keys($files));
        $indexOf = fn (string $needle) => collect($paths)->search(fn ($p) => str_contains($p, $needle));

        $this->assertLessThan($indexOf('productos'), $indexOf('categorias'));
        $this->assertLessThan($indexOf('productos'), $indexOf('proveedores'));

        $productosMigration = collect($files)->first(fn ($c, $p) => str_contains($p, 'productos'));
        $this->assertStringContainsString("foreignId('categoria_id')->constrained('nx_categorias', 'id')", $productosMigration);
        $this->assertStringContainsString("foreignId('proveedor_id')->nullable()->constrained('nx_proveedores', 'id')->nullOnDelete()", $productosMigration);

        // Run all three for real, in the generated order, against scratch table names.
        $suffix = '_'.uniqid();
        $created = [];
        try {
            foreach ($files as $contents) {
                $contents = preg_replace('/nx_(productos|categorias|proveedores)/', 'zz_$1'.$suffix, $contents);
                $tmp = sys_get_temp_dir().'/'.uniqid('export_test_').'.php';
                file_put_contents($tmp, $contents);
                $migration = require $tmp;
                $migration->up();
                unlink($tmp);
            }
            $created = ['zz_categorias'.$suffix, 'zz_proveedores'.$suffix, 'zz_productos'.$suffix];
            foreach ($created as $table) {
                $this->assertTrue(Schema::hasTable($table));
            }
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
            foreach (array_reverse($created) as $table) {
                DB::statement("DROP TABLE IF EXISTS `{$table}`");
            }
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }
    }
}

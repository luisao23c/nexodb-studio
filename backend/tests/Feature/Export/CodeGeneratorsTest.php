<?php

namespace Tests\Feature\Export;

use App\Models\Project;
use App\Services\Export\ControllerGenerator;
use App\Services\Export\MigrationGenerator;
use App\Services\Export\ModelGenerator;
use App\Services\Export\RoutesGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CodeGeneratorsTest extends TestCase
{
    use RefreshDatabase;

    private function assertPhpSyntaxValid(string $contents, string $label): void
    {
        $tmp = tempnam(sys_get_temp_dir(), 'gen').'.php';
        file_put_contents($tmp, $contents);
        $result = (string) shell_exec('php -l '.escapeshellarg($tmp).' 2>&1');
        unlink($tmp);
        $this->assertStringContainsString('No syntax errors detected', $result, "{$label} has invalid PHP:\n{$contents}");
    }

    public function test_model_generator_produces_valid_php_for_every_table(): void
    {
        $files = app(ModelGenerator::class)->generate(['nx_productos', 'nx_categorias', 'nx_proveedores']);

        $this->assertArrayHasKey('app/Models/Producto.php', $files);
        $this->assertArrayHasKey('app/Models/Categoria.php', $files);
        // Laravel's Str::singular() uses English inflection rules, which don't perfectly handle Spanish
        // "-es" plurals ("proveedores" -> "Proveedore" instead of "Proveedor"). Accepted cosmetic
        // limitation — the class name is still valid, unique PHP and doesn't affect functionality;
        // a general Spanish-aware singularizer would need a dictionary to avoid breaking "clientes" -> "cliente".
        $this->assertArrayHasKey('app/Models/Proveedore.php', $files);

        foreach ($files as $path => $contents) {
            $this->assertPhpSyntaxValid($contents, $path);
        }

        // The FK to categoria (in-set) becomes a real relation; both directions.
        $this->assertStringContainsString('belongsTo(Categoria::class', $files['app/Models/Producto.php']);
        $this->assertStringContainsString('hasMany(Producto::class', $files['app/Models/Categoria.php']);
    }

    public function test_generated_model_performs_real_crud_against_a_migrated_scratch_table(): void
    {
        $suffix = '_'.uniqid();
        $scratchTable = 'zz_crudtest'.$suffix;

        $migrationFiles = app(MigrationGenerator::class)->generate(['nx_categorias']);
        $migrationCode = str_replace('nx_categorias', $scratchTable, array_values($migrationFiles)[0]);
        $migrationPath = sys_get_temp_dir().'/'.uniqid('mig_').'.php';
        file_put_contents($migrationPath, $migrationCode);
        $migration = require $migrationPath;
        $migration->up();
        unlink($migrationPath);

        $modelFiles = app(ModelGenerator::class)->generate(['nx_categorias']);
        $modelCode = str_replace(
            ['class Categoria extends Model', "protected \$table = 'nx_categorias'"],
            ["class CategoriaTest{$this->safeSuffix($suffix)} extends Model", "protected \$table = '{$scratchTable}'"],
            array_values($modelFiles)[0]
        );
        $modelPath = sys_get_temp_dir().'/'.uniqid('model_').'.php';
        file_put_contents($modelPath, $modelCode);

        try {
            require $modelPath;
            $class = '\\App\\Models\\CategoriaTest'.$this->safeSuffix($suffix);

            $row = $class::create(['nombre' => 'Bebidas', 'slug' => 'bebidas-'.uniqid(), 'activa' => true]);
            $this->assertDatabaseHas($scratchTable, ['nombre' => 'Bebidas']);

            $row->update(['nombre' => 'Bebidas y Snacks']);
            $this->assertSame('Bebidas y Snacks', $class::find($row->id)->nombre);

            $row->delete();
            $this->assertDatabaseMissing($scratchTable, ['id' => $row->id]);
        } finally {
            unlink($modelPath);
            DB::statement("DROP TABLE IF EXISTS `{$scratchTable}`");
        }
    }

    private function safeSuffix(string $suffix): string
    {
        return str_replace('_', '', $suffix);
    }

    public function test_controller_and_request_generator_produces_valid_php_with_ported_validation(): void
    {
        $project = Project::create(['name' => 'Tienda', 'slug' => 'tienda-'.uniqid()]);
        $form = $project->forms()->create([
            'name' => 'Formulario clientes', 'form_key' => 'clientes-'.uniqid(), 'table_name' => 'nx_clientes',
            'layout_columns' => 2, 'submit_label' => 'Guardar',
        ]);
        $form->fields()->create(['field_key' => 'nombre', 'label' => 'Nombre', 'field_type' => 'text', 'required' => true, 'width' => 12, 'config' => ['max_length' => 120]]);
        $form->fields()->create(['field_key' => 'email', 'label' => 'Correo', 'field_type' => 'email', 'required' => false, 'width' => 12]);

        $files = app(ControllerGenerator::class)->generate(['nx_clientes'], collect([$form->fresh('fields')]));

        $this->assertArrayHasKey('app/Http/Requests/ClienteRequest.php', $files);
        $this->assertArrayHasKey('app/Http/Controllers/Api/ClienteController.php', $files);
        foreach ($files as $path => $contents) {
            $this->assertPhpSyntaxValid($contents, $path);
        }

        $requestCode = $files['app/Http/Requests/ClienteRequest.php'];
        $this->assertStringContainsString("'nombre' => 'required|string|max:120'", $requestCode);
        $this->assertStringContainsString("'email' => 'nullable|email'", $requestCode);
    }

    public function test_controller_generator_falls_back_to_column_based_rules_without_a_form(): void
    {
        $files = app(ControllerGenerator::class)->generate(['nx_categorias'], collect());

        $requestCode = $files['app/Http/Requests/CategoriaRequest.php'];
        $this->assertPhpSyntaxValid($requestCode, 'CategoriaRequest');
        $this->assertStringContainsString("'nombre' => 'required|string'", $requestCode);
    }

    public function test_routes_generator_produces_valid_php_wiring_every_controller(): void
    {
        $code = app(RoutesGenerator::class)->generate(['nx_productos', 'nx_categorias']);

        $this->assertPhpSyntaxValid($code, 'routes/api.php');
        $this->assertStringContainsString("Route::apiResource('productos', ProductoController::class)->parameters(['productos' => 'producto']);", $code);
        $this->assertStringContainsString("Route::apiResource('categorias', CategoriaController::class)->parameters(['categorias' => 'categoria']);", $code);
    }
}

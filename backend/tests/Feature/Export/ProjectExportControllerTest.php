<?php

namespace Tests\Feature\Export;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectExportControllerTest extends TestCase
{
    use RefreshDatabase;

    private function key(): string
    {
        return (string) config('services.builder_admin_key');
    }

    public function test_export_downloads_a_zip_with_a_working_backend_scaffold(): void
    {
        $project = Project::create(['name' => 'Tienda Demo', 'slug' => 'tienda-demo-'.uniqid()]);
        $project->views()->create(['name' => 'V', 'view_key' => 'v1', 'table_name' => 'nx_categorias', 'primary_key' => 'id', 'default_sort_direction' => 'desc', 'per_page' => 20]);

        $response = $this->postJson("/api/builder/projects/{$project->id}/export", [], ['X-Builder-Key' => $this->key()])
            ->assertOk()
            ->assertHeader('content-type', 'application/zip');

        $zipPath = sys_get_temp_dir().'/'.uniqid('export_download_').'.zip';
        file_put_contents($zipPath, $response->streamedContent());

        $extractDir = sys_get_temp_dir().'/'.uniqid('export_extracted_');
        mkdir($extractDir);

        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($zipPath) === true);
        $zip->extractTo($extractDir);
        $zip->close();

        $this->assertFileExists("{$extractDir}/backend/composer.json");
        $this->assertFileExists("{$extractDir}/backend/artisan");
        $this->assertFileExists("{$extractDir}/backend/bootstrap/app.php");
        $this->assertFileExists("{$extractDir}/backend/routes/api.php");
        $this->assertFileExists("{$extractDir}/backend/app/Models/Categoria.php");
        $this->assertFileExists("{$extractDir}/backend/app/Http/Controllers/Api/CategoriaController.php");

        $composer = json_decode(file_get_contents("{$extractDir}/backend/composer.json"), true);
        $this->assertIsArray($composer);
        $this->assertArrayHasKey('laravel/framework', $composer['require']);

        $phpFiles = new \RegexIterator(
            new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($extractDir)),
            '/\.php$/'
        );
        $checked = 0;
        foreach ($phpFiles as $file) {
            $result = shell_exec('php -l '.escapeshellarg($file->getPathname()).' 2>&1');
            $this->assertStringContainsString('No syntax errors detected', (string) $result, "Invalid PHP in {$file->getPathname()}:\n".file_get_contents($file->getPathname()));
            $checked++;
        }
        $this->assertGreaterThan(5, $checked, 'Expected several generated PHP files to be checked.');

        exec('rm -rf '.escapeshellarg($extractDir));
        unlink($zipPath);
    }

    public function test_export_requires_the_builder_key(): void
    {
        $project = Project::create(['name' => 'Tienda', 'slug' => 'tienda-'.uniqid()]);

        $this->postJson("/api/builder/projects/{$project->id}/export")->assertStatus(401);
    }
}

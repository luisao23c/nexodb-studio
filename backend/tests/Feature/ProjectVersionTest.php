<?php

namespace Tests\Feature;

use App\Models\BuilderForm;
use App\Models\Project;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProjectVersionTest extends TestCase
{
    use RefreshDatabase;

    private function headers(): array
    {
        return ['X-Builder-Key' => (string) config('services.builder_admin_key')];
    }

    public function test_it_creates_semantic_versions_and_restores_a_snapshot(): void
    {
        $project = Project::create(['name' => 'CRM', 'slug' => 'crm']);
        $projectHeaders = $this->headers() + ['X-Project-Id' => (string) $project->id];
        $route = $this->postJson('/api/builder/routes', ['name' => 'Clientes', 'content_type' => 'empty'], $projectHeaders)->assertCreated()->json('route');

        $first = $this->postJson("/api/builder/projects/{$project->id}/versions", ['bump' => 'auto', 'label' => 'Primera entrega'], $this->headers())
            ->assertCreated()->json();
        $this->assertSame('1.0.0', $first['version']);

        $this->putJson("/api/builder/routes/{$route['id']}", ['name' => 'Clientes editados'], $projectHeaders)->assertOk();
        $second = $this->postJson("/api/builder/projects/{$project->id}/versions", ['bump' => 'auto'], $this->headers())->assertCreated()->json();
        $this->assertSame('1.0.1', $second['version']);

        $this->postJson("/api/builder/projects/{$project->id}/versions/{$first['id']}/restore", [], $this->headers())->assertOk();
        $this->assertDatabaseHas('nx_routes', ['id' => $route['id'], 'name' => 'Clientes']);
    }

    public function test_public_preview_writes_require_explicit_project_permission(): void
    {
        Schema::create('nx_preview_records', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });
        $project = Project::create(['name' => 'Demo', 'slug' => 'demo', 'is_public' => true, 'preview_writes_enabled' => false]);
        BuilderForm::create(['project_id' => $project->id, 'name' => 'Registro', 'form_key' => 'registro', 'table_name' => 'nx_preview_records', 'layout_columns' => 1, 'submit_label' => 'Guardar', 'active' => true]);

        $this->postJson("/api/preview/{$project->id}/data/nx_preview_records", ['name' => 'Bloqueado'])->assertForbidden();
        $project->update(['preview_writes_enabled' => true]);
        $this->postJson("/api/preview/{$project->id}/data/nx_preview_records", ['name' => 'Funcional'])->assertCreated();
        $this->assertDatabaseHas('nx_preview_records', ['name' => 'Funcional']);
    }
}

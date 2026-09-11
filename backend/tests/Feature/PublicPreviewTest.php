<?php

namespace Tests\Feature;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PublicPreviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_private_project_returns_404_on_every_endpoint(): void
    {
        $project = Project::create(['name' => 'Privado', 'slug' => 'privado', 'is_public' => false]);

        $this->getJson("/api/preview/{$project->id}/routes")->assertStatus(404);
        $this->getJson("/api/preview/{$project->id}/forms")->assertStatus(404);
        $this->getJson("/api/preview/{$project->id}/views")->assertStatus(404);
        $this->getJson("/api/preview/{$project->id}/data/nx_configuracion")->assertStatus(404);
    }

    public function test_public_project_exposes_active_routes_and_paths(): void
    {
        $project = Project::create(['name' => 'Público', 'slug' => 'publico', 'is_public' => true]);
        $project->routes()->create(['name' => 'Inicio', 'slug' => 'inicio', 'content_type' => 'empty', 'active' => true]);
        $project->routes()->create(['name' => 'Oculta', 'slug' => 'oculta', 'content_type' => 'empty', 'active' => false]);

        $response = $this->getJson("/api/preview/{$project->id}/routes")->assertOk()->json();

        $this->assertCount(1, $response['routes']);
        $this->assertSame('inicio', $response['routes'][0]['slug']);
    }

    public function test_public_preview_rejects_non_nx_table(): void
    {
        $project = Project::create(['name' => 'Público', 'slug' => 'publico', 'is_public' => true]);
        Schema::create('other_table', function ($table) {
            $table->id();
            $table->string('secret');
        });

        $this->getJson("/api/preview/{$project->id}/data/other_table")->assertStatus(404);
    }

    public function test_public_preview_browse_reads_nx_table(): void
    {
        $project = Project::create(['name' => 'Público', 'slug' => 'publico', 'is_public' => true]);

        $this->getJson("/api/preview/{$project->id}/data/nx_configuracion")->assertOk()
            ->assertJsonStructure(['data', 'total', 'current_page', 'last_page', 'per_page']);
    }

    public function test_chart_from_another_project_is_not_exposed(): void
    {
        $projectA = Project::create(['name' => 'A', 'slug' => 'a', 'is_public' => true]);
        $projectB = Project::create(['name' => 'B', 'slug' => 'b', 'is_public' => true]);
        $chart = $projectB->charts()->create([
            'name' => 'Chart B', 'table_name' => 'nx_configuracion', 'label_field' => 'grupo',
            'chart_type' => 'bar', 'aggregate' => 'count', 'sort_direction' => 'desc', 'limit' => 10,
        ]);

        $this->getJson("/api/preview/{$projectA->id}/charts/{$chart->id}")->assertStatus(404);
    }
}

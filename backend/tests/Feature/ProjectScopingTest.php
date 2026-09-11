<?php

namespace Tests\Feature;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectScopingTest extends TestCase
{
    use RefreshDatabase;

    private function key(): string
    {
        return (string) config('services.builder_admin_key');
    }

    private function headers(?Project $project = null): array
    {
        $headers = ['X-Builder-Key' => $this->key()];
        if ($project) {
            $headers['X-Project-Id'] = (string) $project->id;
        }

        return $headers;
    }

    public function test_project_scoped_endpoint_requires_project_header(): void
    {
        $this->getJson('/api/builder/routes', ['X-Builder-Key' => $this->key()])
            ->assertStatus(422);
    }

    public function test_project_scoped_endpoint_rejects_unknown_project(): void
    {
        $this->getJson('/api/builder/routes', ['X-Builder-Key' => $this->key(), 'X-Project-Id' => '999999'])
            ->assertStatus(422);
    }

    public function test_menus_do_not_leak_across_projects(): void
    {
        $projectA = Project::create(['name' => 'Tienda', 'slug' => 'tienda']);
        $projectB = Project::create(['name' => 'CRM', 'slug' => 'crm']);

        $this->postJson('/api/builder/menus', ['name' => 'Menu A'], $this->headers($projectA))->assertCreated();
        $this->postJson('/api/builder/menus', ['name' => 'Menu B'], $this->headers($projectB))->assertCreated();

        $listA = $this->getJson('/api/builder/menus', $this->headers($projectA))->assertOk()->json();
        $listB = $this->getJson('/api/builder/menus', $this->headers($projectB))->assertOk()->json();

        $this->assertCount(1, $listA);
        $this->assertCount(1, $listB);
        $this->assertSame('Menu A', $listA[0]['name']);
        $this->assertSame('Menu B', $listB[0]['name']);
    }

    public function test_cannot_update_menu_belonging_to_another_project(): void
    {
        $projectA = Project::create(['name' => 'Tienda', 'slug' => 'tienda']);
        $projectB = Project::create(['name' => 'CRM', 'slug' => 'crm']);

        $menu = $this->postJson('/api/builder/menus', ['name' => 'Menu A'], $this->headers($projectA))->json();

        $this->putJson("/api/builder/menus/{$menu['id']}", ['name' => 'Hijacked'], $this->headers($projectB))
            ->assertStatus(404);
    }

    public function test_routes_do_not_leak_across_projects(): void
    {
        $projectA = Project::create(['name' => 'Tienda', 'slug' => 'tienda']);
        $projectB = Project::create(['name' => 'CRM', 'slug' => 'crm']);

        $this->postJson('/api/builder/routes', ['name' => 'Inicio', 'content_type' => 'empty'], $this->headers($projectA))->assertCreated();

        $flatA = $this->getJson('/api/builder/routes-flat', $this->headers($projectA))->assertOk()->json('routes');
        $flatB = $this->getJson('/api/builder/routes-flat', $this->headers($projectB))->assertOk()->json('routes');

        $this->assertCount(1, $flatA);
        $this->assertCount(0, $flatB);
    }

    public function test_cannot_delete_the_last_project(): void
    {
        Project::query()->delete();
        $onlyProject = Project::create(['name' => 'Único', 'slug' => 'unico']);

        $this->deleteJson("/api/builder/projects/{$onlyProject->id}", [], ['X-Builder-Key' => $this->key()])
            ->assertStatus(422);
    }

    public function test_deleting_a_project_cascades_its_routes(): void
    {
        $project = Project::create(['name' => 'Tienda', 'slug' => 'tienda']);
        Project::create(['name' => 'CRM', 'slug' => 'crm']);

        $route = $this->postJson('/api/builder/routes', ['name' => 'Inicio', 'content_type' => 'empty'], $this->headers($project))->json('route');

        $this->deleteJson("/api/builder/projects/{$project->id}", [], ['X-Builder-Key' => $this->key()])->assertNoContent();

        $this->assertDatabaseMissing('nx_routes', ['id' => $route['id']]);
    }
}

<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\DB;

class ProjectSnapshotService
{
    public function capture(Project $project): array
    {
        return [
            'schema_version' => 1,
            'project' => $project->only(['name', 'icon']),
            'routes' => $project->routes()->orderBy('id')->get()->toArray(),
            'menus' => $project->menus()->with('items')->orderBy('id')->get()->toArray(),
            'forms' => $project->forms()->with('fields')->orderBy('id')->get()->toArray(),
            'views' => $project->views()->with('columns')->orderBy('id')->get()->toArray(),
            'charts' => $project->charts()->orderBy('id')->get()->toArray(),
            'pages' => $project->pages()->orderBy('id')->get()->toArray(),
        ];
    }

    public function hash(array $snapshot): string
    {
        return hash('sha256', json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    public function summary(array $snapshot, ?array $previous = null): array
    {
        $labels = ['routes' => 'rutas', 'menus' => 'menús', 'forms' => 'formularios', 'views' => 'vistas', 'charts' => 'gráficas', 'pages' => 'páginas'];
        $summary = [];
        foreach ($labels as $key => $label) {
            $current = count($snapshot[$key] ?? []);
            $before = count($previous[$key] ?? []);
            $summary[$key] = ['label' => $label, 'total' => $current, 'delta' => $current - $before];
        }

        return $summary;
    }

    public function hasStructuralChanges(array $snapshot, array $previous): bool
    {
        foreach (['routes', 'menus', 'forms', 'views', 'charts', 'pages'] as $key) {
            $currentIds = collect($snapshot[$key] ?? [])->pluck('id')->sort()->values()->all();
            $previousIds = collect($previous[$key] ?? [])->pluck('id')->sort()->values()->all();
            if ($currentIds !== $previousIds) return true;
        }

        return false;
    }

    public function restore(Project $project, array $snapshot): void
    {
        DB::transaction(function () use ($project, $snapshot) {
            $projectId = $project->id;
            DB::table('nx_routes')->where('project_id', $projectId)->update(['parent_id' => null]);
            DB::table('nx_routes')->where('project_id', $projectId)->delete();
            DB::table('builder_menus')->where('project_id', $projectId)->delete();
            DB::table('builder_forms')->where('project_id', $projectId)->delete();
            DB::table('builder_views')->where('project_id', $projectId)->delete();
            DB::table('builder_charts')->where('project_id', $projectId)->delete();
            DB::table('builder_pages')->where('project_id', $projectId)->delete();

            $projectData = $snapshot['project'] ?? [];
            $project->update(array_intersect_key($projectData, array_flip(['name', 'icon'])));

            $routes = collect($snapshot['routes'] ?? [])->map(fn ($row) => $this->withProject($row, $projectId))->all();
            $routeParents = collect($routes)->pluck('parent_id', 'id');
            $this->insertRows('nx_routes', array_map(fn ($row) => [...$row, 'parent_id' => null], $routes), ['content_config']);
            foreach ($routeParents as $id => $parentId) if ($parentId) DB::table('nx_routes')->where('id', $id)->update(['parent_id' => $parentId]);

            foreach ($snapshot['menus'] ?? [] as $menu) {
                $items = $menu['items'] ?? [];
                unset($menu['items']);
                $this->insertRows('builder_menus', [$this->withProject($menu, $projectId)]);
                $parents = collect($items)->pluck('parent_id', 'id');
                $this->insertRows('builder_menu_items', array_map(fn ($row) => [...$row, 'parent_id' => null], $items), ['required_role_ids']);
                foreach ($parents as $id => $parentId) if ($parentId) DB::table('builder_menu_items')->where('id', $id)->update(['parent_id' => $parentId]);
            }

            foreach ($snapshot['forms'] ?? [] as $form) {
                $fields = $form['fields'] ?? [];
                unset($form['fields']);
                $this->insertRows('builder_forms', [$this->withProject($form, $projectId)], ['settings']);
                $this->insertRows('builder_form_fields', $fields, ['options', 'config']);
            }

            foreach ($snapshot['views'] ?? [] as $view) {
                $columns = $view['columns'] ?? [];
                unset($view['columns']);
                $this->insertRows('builder_views', [$this->withProject($view, $projectId)], ['settings']);
                $this->insertRows('builder_view_columns', $columns, ['config']);
            }

            $this->insertRows('builder_charts', array_map(fn ($row) => $this->withProject($row, $projectId), $snapshot['charts'] ?? []));
            $this->insertRows('builder_pages', array_map(fn ($row) => $this->withProject($row, $projectId), $snapshot['pages'] ?? []));
        });
    }

    private function withProject(array $row, int $projectId): array
    {
        $row['project_id'] = $projectId;
        return $row;
    }

    private function insertRows(string $table, array $rows, array $jsonColumns = []): void
    {
        foreach ($rows as $row) {
            foreach (['created_at', 'updated_at'] as $timestamp) {
                if (! empty($row[$timestamp])) $row[$timestamp] = \Illuminate\Support\Carbon::parse($row[$timestamp])->format('Y-m-d H:i:s');
            }
            foreach ($jsonColumns as $column) {
                if (array_key_exists($column, $row) && is_array($row[$column])) $row[$column] = json_encode($row[$column], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            DB::table($table)->insert($row);
        }
    }
}

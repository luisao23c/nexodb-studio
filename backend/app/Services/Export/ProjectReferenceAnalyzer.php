<?php

namespace App\Services\Export;

use App\Models\BuilderForm;
use App\Models\BuilderRoute;
use App\Models\Project;
use Illuminate\Support\Collection;

/**
 * Walks a project's forms/views/charts and its route component trees to determine exactly which
 * nx_ tables the project actually uses — the export only includes what's referenced, nothing more.
 */
class ProjectReferenceAnalyzer
{
    public function analyze(Project $project): ExportReferenceSet
    {
        /** @var Collection<int, BuilderForm> $forms */
        $forms = $project->forms()->with('fields')->get();
        $views = $project->views()->with('columns')->get();
        $charts = $project->charts()->get();

        $tableNames = collect()
            ->merge($forms->pluck('table_name'))
            ->merge($views->pluck('table_name'))
            ->merge($charts->pluck('table_name'));

        // Also catch raw table_name references inside route component trees (e.g. `list`/`table_detail`
        // components, which point at a table directly rather than through a saved BuilderForm/View row).
        foreach ($project->routes()->get() as $route) {
            $tableNames = $tableNames->merge($this->tableNamesInComponents($this->componentsOf($route)));
        }

        // Relation-backed select fields fetch another table's rows client-side at runtime, so that
        // table must be exported too even though it isn't a form/view/chart's own table_name.
        foreach ($forms as $form) {
            foreach ($form->fields as $field) {
                $config = $field->config ?? [];
                if (($config['options_source'] ?? null) === 'relation' && ! empty($config['relation_table'])) {
                    $tableNames->push($config['relation_table']);
                }
            }
        }

        $tableNames = $tableNames->filter()->unique()->values()->all();

        return new ExportReferenceSet($tableNames, $forms, $views, $charts);
    }

    /** Returns the effective component tree for a route, normalizing legacy tab shapes like the frontend does. */
    private function componentsOf(BuilderRoute $route): array
    {
        $config = $route->content_config ?? [];

        return is_array($config['components'] ?? null) ? $config['components'] : [];
    }

    /** Recursively collects `config.table_name` from list/table_detail components and walks container types. */
    private function tableNamesInComponents(array $components): Collection
    {
        $names = collect();

        foreach ($components as $component) {
            if (! is_array($component)) {
                continue;
            }
            $type = $component['type'] ?? null;
            $config = $component['config'] ?? [];

            if (in_array($type, ['list', 'table_detail'], true) && ! empty($config['table_name'])) {
                $names->push($config['table_name']);
            }

            if ($type === 'columns' && is_array($config['children'] ?? null)) {
                foreach ($config['children'] as $column) {
                    if (is_array($column)) {
                        $names = $names->merge($this->tableNamesInComponents($column));
                    }
                }
            }

            if ($type === 'card' && is_array($config['children'] ?? null)) {
                $names = $names->merge($this->tableNamesInComponents($config['children']));
            }

            if ($type === 'tabs' && is_array($config['tabs'] ?? null)) {
                foreach ($config['tabs'] as $tab) {
                    if (is_array($tab['components'] ?? null)) {
                        $names = $names->merge($this->tableNamesInComponents($tab['components']));
                    }
                }
            }

            if ($type === 'button' && is_array($config['modal_components'] ?? null)) {
                $names = $names->merge($this->tableNamesInComponents($config['modal_components']));
            }
        }

        return $names;
    }
}

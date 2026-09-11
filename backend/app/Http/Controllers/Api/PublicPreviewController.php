<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderChart;
use App\Models\BuilderRoute;
use App\Models\Project;
use App\Support\SafeIdentifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Read-only, unauthenticated endpoints backing the standalone shareable preview.
 * Every method requires the target project to have opted in via `is_public`.
 */
class PublicPreviewController extends Controller
{
    public function routes(Project $project): JsonResponse
    {
        $this->assertPublic($project);

        /** @var Collection<int, BuilderRoute> $all */
        $all = $project->routes()->where('active', true)->orderBy('sort_order')->get();
        $byId = $all->keyBy('id');
        $roots = collect();

        foreach ($all as $route) {
            $route->setRelation('children', collect());
        }
        foreach ($all as $route) {
            if ($route->parent_id && $byId->has($route->parent_id)) {
                $byId[$route->parent_id]->children->push($route);
            } elseif (! $route->parent_id) {
                $roots->push($route);
            }
        }

        $pathMap = [];
        foreach ($all as $r) {
            $pathMap[$r->id] = $this->buildPath($r, $all);
        }

        return response()->json(['routes' => $roots, 'paths' => $pathMap]);
    }

    public function forms(Project $project): JsonResponse
    {
        $this->assertPublic($project);

        return response()->json($project->forms()->with('fields')->where('active', true)->get());
    }

    public function views(Project $project): JsonResponse
    {
        $this->assertPublic($project);

        return response()->json($project->views()->with('columns')->where('active', true)->get());
    }

    public function browse(Request $request, Project $project, string $table): JsonResponse
    {
        $this->assertPublic($project);
        $this->assertSafeTable($table);

        $perPage = min((int) $request->query('per_page', 25), 100);
        $page = max((int) $request->query('page', 1), 1);
        $search = trim((string) $request->query('search', ''));

        $columns = collect(DB::select("SHOW COLUMNS FROM `{$table}`"))->pluck('Field')->all();
        $query = DB::table($table);
        if ($search !== '') {
            $query->where(function ($q) use ($columns, $search) {
                foreach ($columns as $i => $col) {
                    $i === 0 ? $q->where($col, 'like', "%{$search}%") : $q->orWhere($col, 'like', "%{$search}%");
                }
            });
        }
        $total = $query->count();
        $rows = $query->orderBy('id')->forPage($page, $perPage)->get();

        return response()->json([
            'data' => $rows, 'total' => $total,
            'current_page' => $page, 'last_page' => (int) ceil($total / $perPage), 'per_page' => $perPage,
        ]);
    }

    public function lookup(Request $request, Project $project, string $table): JsonResponse
    {
        $this->assertPublic($project);
        $this->assertSafeTable($table);

        $data = $request->validate([
            'value_column' => ['required', 'string', 'regex:/^[a-zA-Z0-9_]+$/'],
            'label_column' => ['required', 'string', 'regex:/^[a-zA-Z0-9_]+$/'],
            'search' => 'nullable|string|max:100',
        ]);
        abort_unless(Schema::hasColumn($table, $data['value_column']) && Schema::hasColumn($table, $data['label_column']), 422, 'Las columnas de la relación no existen.');

        $query = DB::table($table)
            ->select([$data['value_column'], $data['label_column']])
            ->whereNotNull($data['value_column'])
            ->whereNotNull($data['label_column']);
        if (! empty($data['search'])) {
            $query->where($data['label_column'], 'like', '%'.$data['search'].'%');
        }

        $options = $query->orderBy($data['label_column'])->limit(30)->get()->map(fn ($row) => [
            'value' => $row->{$data['value_column']},
            'label' => (string) $row->{$data['label_column']},
        ]);

        return response()->json($options);
    }

    public function chartData(Project $project, BuilderChart $chart): JsonResponse
    {
        $this->assertPublic($project);
        abort_unless($chart->project_id === $project->id, 404);
        $this->assertSafeTable($chart->table_name);

        $columns = Schema::getColumnListing($chart->table_name);
        abort_unless(in_array($chart->label_field, $columns, true), 422, 'Campo de etiqueta inválido.');

        $query = DB::table($chart->table_name);
        if ($chart->aggregate === 'count') {
            $rows = $query->select($chart->label_field.' as label', DB::raw('COUNT(*) as value'));
        } else {
            abort_unless($chart->value_field && in_array($chart->value_field, $columns, true), 422, 'Campo de valor inválido.');
            $aggregate = match ($chart->aggregate) {
                'avg' => 'AVG', 'min' => 'MIN', 'max' => 'MAX', default => 'SUM'
            };
            $rows = $query->select($chart->label_field.' as label', DB::raw("{$aggregate}(`{$chart->value_field}`) as value"));
        }

        $rows = $rows->groupBy($chart->label_field)->orderBy('value', $chart->sort_direction)->limit(min($chart->limit, 50))->get();

        return response()->json([
            'chart' => $chart->only(['id', 'name', 'chart_type', 'color']),
            'data' => $rows->map(fn ($row) => ['label' => (string) ($row->label ?? 'Sin valor'), 'value' => (float) $row->value]),
        ]);
    }

    private function assertPublic(Project $project): void
    {
        abort_unless($project->is_public, 404);
    }

    private function assertSafeTable(string $table): void
    {
        abort_unless(SafeIdentifier::tableExists($table), 404, 'Tabla no encontrada.');
    }

    private function buildPath(BuilderRoute $route, $all): string
    {
        $parts = [];
        $current = $route;
        while ($current) {
            array_unshift($parts, $current->slug);
            $current = $all->firstWhere('id', $current->parent_id);
        }

        return '/'.implode('/', $parts);
    }
}

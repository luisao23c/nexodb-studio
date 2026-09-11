<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderRoute;
use App\Models\Project;
use App\Support\SafeIdentifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Public endpoints backing the standalone shareable preview.
 * Mutations additionally require the project's explicit write opt-in.
 */
class PublicPreviewController extends Controller
{
    public function routes(Project $project): JsonResponse
    {
        $this->assertPublic($project);

        if ($snapshot = $this->publishedSnapshot($project)) {
            $rows = collect($snapshot['routes'] ?? [])->filter(fn ($row) => $row['active'] ?? false)->map(fn ($row) => array_merge($row, ['children' => []]))->keyBy('id');
            $roots = [];
            foreach ($rows as $id => $route) {
                if (! empty($route['parent_id']) && $rows->has($route['parent_id'])) {
                    $parent = $rows[$route['parent_id']];
                    $parent['children'][] = $route;
                    $rows[$route['parent_id']] = $parent;
                }
            }
            foreach ($rows as $route) if (empty($route['parent_id'])) $roots[] = $this->hydrateSnapshotChildren($route, $rows);
            $paths = [];
            foreach ($rows as $route) $paths[$route['id']] = $this->buildSnapshotPath($route, $rows);
            return response()->json(['routes' => $roots, 'paths' => $paths, 'version' => $project->versions()->where('is_published', true)->value('version'), 'project' => $project->only(['id', 'name', 'slug', 'preview_writes_enabled'])]);
        }

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

        return response()->json(['routes' => $roots, 'paths' => $pathMap, 'version' => null, 'project' => $project->only(['id', 'name', 'slug', 'preview_writes_enabled'])]);
    }

    public function forms(Project $project): JsonResponse
    {
        $this->assertPublic($project);

        if ($snapshot = $this->publishedSnapshot($project)) return response()->json(collect($snapshot['forms'] ?? [])->where('active', true)->values());

        return response()->json($project->forms()->with('fields')->where('active', true)->get());
    }

    public function views(Project $project): JsonResponse
    {
        $this->assertPublic($project);

        if ($snapshot = $this->publishedSnapshot($project)) return response()->json(collect($snapshot['views'] ?? [])->where('active', true)->values());

        return response()->json($project->views()->with('columns')->where('active', true)->get());
    }

    public function browse(Request $request, Project $project, string $table): JsonResponse
    {
        $this->assertPublic($project);
        $this->assertProjectTable($project, $table);

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
        $this->assertProjectTable($project, $table);

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

    public function chartData(Project $project, int $chart): JsonResponse
    {
        $this->assertPublic($project);
        $snapshot = $this->publishedSnapshot($project);
        $config = $snapshot
            ? collect($snapshot['charts'] ?? [])->firstWhere('id', $chart)
            : $project->charts()->find($chart)?->toArray();
        abort_unless($config, 404);
        $this->assertProjectTable($project, $config['table_name']);

        $columns = Schema::getColumnListing($config['table_name']);
        abort_unless(in_array($config['label_field'], $columns, true), 422, 'Campo de etiqueta inválido.');

        $query = DB::table($config['table_name']);
        if ($config['aggregate'] === 'count') {
            $rows = $query->select($config['label_field'].' as label', DB::raw('COUNT(*) as value'));
        } else {
            abort_unless($config['value_field'] && in_array($config['value_field'], $columns, true), 422, 'Campo de valor inválido.');
            $aggregate = match ($config['aggregate']) {
                'avg' => 'AVG', 'min' => 'MIN', 'max' => 'MAX', default => 'SUM'
            };
            $rows = $query->select($config['label_field'].' as label', DB::raw("{$aggregate}(`{$config['value_field']}`) as value"));
        }

        $rows = $rows->groupBy($config['label_field'])->orderBy('value', $config['sort_direction'])->limit(min($config['limit'], 50))->get();

        return response()->json([
            'chart' => collect($config)->only(['id', 'name', 'chart_type', 'color']),
            'data' => $rows->map(fn ($row) => ['label' => (string) ($row->label ?? 'Sin valor'), 'value' => (float) $row->value]),
        ]);
    }

    public function store(Request $request, Project $project, string $table): JsonResponse
    {
        $this->assertWritable($project, $table);
        $payload = $this->editablePayload($request, $table);
        $columns = Schema::getColumnListing($table);
        if (in_array('created_at', $columns, true)) $payload['created_at'] = now();
        if (in_array('updated_at', $columns, true)) $payload['updated_at'] = now();
        $id = DB::table($table)->insertGetId($payload);
        return response()->json((array) DB::table($table)->where('id', $id)->first(), 201);
    }

    public function update(Request $request, Project $project, string $table, int $id): JsonResponse
    {
        $this->assertWritable($project, $table);
        abort_unless(DB::table($table)->where('id', $id)->exists(), 404, 'Registro no encontrado.');
        $payload = $this->editablePayload($request, $table);
        if (Schema::hasColumn($table, 'updated_at')) $payload['updated_at'] = now();
        DB::table($table)->where('id', $id)->update($payload);
        return response()->json((array) DB::table($table)->where('id', $id)->first());
    }

    public function destroy(Project $project, string $table, int $id): JsonResponse
    {
        $this->assertWritable($project, $table);
        DB::table($table)->where('id', $id)->delete();
        return response()->json(null, 204);
    }

    private function assertPublic(Project $project): void
    {
        abort_unless($project->is_public, 404);
    }

    private function assertSafeTable(string $table): void
    {
        abort_unless(SafeIdentifier::tableExists($table), 404, 'Tabla no encontrada.');
    }

    private function assertProjectTable(Project $project, string $table): void
    {
        $this->assertSafeTable($table);
        $snapshot = $this->publishedSnapshot($project);
        $allowed = $snapshot
            ? collect(array_merge($snapshot['forms'] ?? [], $snapshot['views'] ?? [], $snapshot['charts'] ?? []))->pluck('table_name')->contains($table)
            : $project->forms()->where('table_name', $table)->exists()
                || $project->views()->where('table_name', $table)->exists()
                || $project->charts()->where('table_name', $table)->exists();
        abort_unless($allowed, 404, 'La tabla no pertenece a este proyecto.');
    }

    private function assertWritable(Project $project, string $table): void
    {
        $this->assertPublic($project);
        abort_unless($project->preview_writes_enabled, 403, 'La escritura está desactivada para este preview.');
        $this->assertProjectTable($project, $table);
    }

    private function editablePayload(Request $request, string $table): array
    {
        $blocked = ['id', 'created_at', 'updated_at', 'deleted_at'];
        $allowed = array_values(array_diff(Schema::getColumnListing($table), $blocked));
        $payload = collect($request->all())->only($allowed)->all();
        abort_if($payload === [], 422, 'No hay campos válidos para guardar.');
        return $payload;
    }

    private function publishedSnapshot(Project $project): ?array
    {
        return $project->versions()->where('is_published', true)->first()?->snapshot;
    }

    private function hydrateSnapshotChildren(array $route, Collection $rows): array
    {
        $route['children'] = $rows->filter(fn ($candidate) => ($candidate['parent_id'] ?? null) === $route['id'])
            ->sortBy('sort_order')->map(fn ($child) => $this->hydrateSnapshotChildren($child, $rows))->values()->all();
        return $route;
    }

    private function buildSnapshotPath(array $route, Collection $rows): string
    {
        $parts = [];
        $current = $route;
        while ($current) {
            array_unshift($parts, $current['slug']);
            $current = ! empty($current['parent_id']) ? $rows->get($current['parent_id']) : null;
        }
        return '/'.implode('/', $parts);
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

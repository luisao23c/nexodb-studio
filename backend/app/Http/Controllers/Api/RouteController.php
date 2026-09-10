<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderRoute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RouteController extends Controller
{
    public function index(): JsonResponse
    {
        $all = BuilderRoute::orderBy('sort_order')->get();
        $byId = $all->keyBy('id');
        $roots = collect();

        foreach ($all as $route) {
            $route->children = collect();
        }

        foreach ($all as $route) {
            if ($route->parent_id && $byId->has($route->parent_id)) {
                $byId[$route->parent_id]->children->push($route);
            } elseif (!$route->parent_id) {
                $roots->push($route);
            }
        }

        return response()->json(['routes' => $roots]);
    }

    public function flat(): JsonResponse
    {
        $routes = BuilderRoute::orderBy('sort_order')->orderBy('parent_id')->get();
        return response()->json(['routes' => $routes]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'slug' => 'nullable|string|max:100',
            'parent_id' => 'nullable|integer|exists:nx_routes,id',
            'icon' => 'nullable|string|max:50',
            'content_type' => 'required|in:table,form,chart,page,redirect,divider,empty',
            'content_config' => 'nullable|array',
            'layout' => 'nullable|in:default,sidebar,tabs,fullwidth,card',
            'visible_in_menu' => 'boolean',
            'badge_color' => 'nullable|string|max:20',
            'badge_label' => 'nullable|string|max:30',
        ]);

        $data['slug'] = $data['slug'] ?? null ?: Str::slug($data['name']);
        $data['sort_order'] = BuilderRoute::where('parent_id', $data['parent_id'] ?? null)->max('sort_order') + 1;

        $route = BuilderRoute::create($data);

        return response()->json(['ok' => true, 'route' => $route], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $route = BuilderRoute::findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'slug' => 'sometimes|string|max:100',
            'icon' => 'nullable|string|max:50',
            'content_type' => 'sometimes|in:table,form,chart,page,redirect,divider,empty',
            'content_config' => 'nullable|array',
            'layout' => 'nullable|in:default,sidebar,tabs,fullwidth,card',
            'active' => 'boolean',
            'visible_in_menu' => 'boolean',
            'badge_color' => 'nullable|string|max:20',
            'badge_label' => 'nullable|string|max:30',
            'sort_order' => 'nullable|integer',
        ]);

        if (isset($data['name']) && !isset($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $route->update($data);

        return response()->json(['ok' => true, 'route' => $route]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order' => 'required|array',
            'order.*.id' => 'required|integer',
            'order.*.parent_id' => 'nullable|integer',
            'order.*.sort_order' => 'required|integer',
        ]);

        foreach ($data['order'] as $item) {
            BuilderRoute::where('id', $item['id'])->update([
                'parent_id' => $item['parent_id'],
                'sort_order' => $item['sort_order'],
            ]);
        }

        return response()->json(['ok' => true]);
    }

    public function destroy(string $id): JsonResponse
    {
        $route = BuilderRoute::findOrFail($id);

        // Move children to parent
        BuilderRoute::where('parent_id', $id)->update(['parent_id' => $route->parent_id]);

        $route->delete();

        return response()->json(['ok' => true]);
    }

    public function preview(): JsonResponse
    {
        $all = BuilderRoute::where('active', true)->orderBy('sort_order')->get();
        $byId = $all->keyBy('id');
        $roots = collect();

        foreach ($all as $route) {
            $route->children = collect();
        }

        foreach ($all as $route) {
            if ($route->parent_id && $byId->has($route->parent_id)) {
                $byId[$route->parent_id]->children->push($route);
            } elseif (!$route->parent_id) {
                $roots->push($route);
            }
        }

        $flat = BuilderRoute::where('active', true)->orderBy('sort_order')->get();
        $pathMap = [];
        foreach ($flat as $r) {
            $pathMap[$r->id] = $this->buildPath($r, $flat);
        }

        return response()->json([
            'routes' => $roots,
            'paths' => $pathMap,
            'tables' => \Illuminate\Support\Facades\DB::select("SHOW TABLES LIKE 'nx_%'"),
        ]);
    }

    private function buildPath(BuilderRoute $route, $all): string
    {
        $parts = [];
        $current = $route;
        while ($current) {
            array_unshift($parts, $current->slug);
            $current = $all->firstWhere('id', $current->parent_id);
        }
        return '/' . implode('/', $parts);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderMenu;
use App\Models\BuilderMenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MenuController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->project()->menus()->with('items')->orderBy('sort_order')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => 'required|string|max:60']);
        $menu = $request->project()->menus()->create([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
            'icon' => $request->input('icon', 'folder'),
        ]);

        return response()->json($menu->load('items'), 201);
    }

    public function update(Request $request, BuilderMenu $menu): JsonResponse
    {
        abort_unless($menu->project_id === $request->project()->id, 404);
        $data = $request->validate([
            'name' => 'sometimes|string|max:60', 'icon' => 'nullable|string|max:30',
            'sort_order' => 'integer|min:0', 'active' => 'boolean',
        ]);
        $menu->update($data);

        return response()->json($menu->fresh()->load('items'));
    }

    public function destroy(Request $request, BuilderMenu $menu): JsonResponse
    {
        abort_unless($menu->project_id === $request->project()->id, 404);
        $menu->delete();

        return response()->json(null, 204);
    }

    public function storeItem(Request $request, BuilderMenu $menu): JsonResponse
    {
        abort_unless($menu->project_id === $request->project()->id, 404);
        $data = $request->validate([
            'label' => 'required|string|max:80',
            'parent_id' => 'nullable|exists:builder_menu_items,id',
            'target_type' => ['required', Rule::in(['table', 'page', 'chart_dashboard', 'url'])],
            'target_id' => 'nullable|integer',
            'target_table' => 'nullable|string|max:64|required_if:target_type,table|regex:/^nx_[a-zA-Z0-9_]+$/',
            'url' => 'nullable|string|max:255|required_if:target_type,url',
            'icon' => 'nullable|string|max:30',
            'badge' => 'nullable|string|max:20',
            'sort_order' => 'nullable|integer|min:0',
            'role_ids' => 'nullable|array', 'role_ids.*' => 'integer|exists:builder_roles,id',
        ]);
        if (($data['target_type'] ?? '') === 'table') {
            abort_unless(Schema::hasTable($data['target_table']), 422, 'La tabla seleccionada no existe.');
        }

        $item = BuilderMenuItem::create([
            'menu_id' => $menu->id,
            'parent_id' => $data['parent_id'] ?? null,
            'label' => $data['label'],
            'icon' => $data['icon'] ?? 'circle',
            'target_type' => $data['target_type'],
            'target_id' => $data['target_id'] ?? null,
            'target_table' => $data['target_table'] ?? null,
            'url' => $data['url'] ?? null,
            'badge' => $data['badge'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
            'required_role_ids' => $data['role_ids'] ?? null,
        ]);

        return response()->json($item, 201);
    }

    public function updateItem(Request $request, BuilderMenu $menu, BuilderMenuItem $item): JsonResponse
    {
        abort_unless($menu->project_id === $request->project()->id && $item->menu_id === $menu->id, 404);
        $data = $request->validate([
            'label' => 'sometimes|string|max:80', 'icon' => 'nullable|string|max:30',
            'target_type' => ['sometimes', Rule::in(['table', 'page', 'chart_dashboard', 'url'])],
            'target_id' => 'nullable|integer', 'target_table' => 'nullable|string|max:64|regex:/^nx_[a-zA-Z0-9_]+$/', 'url' => 'nullable|string|max:255',
            'badge' => 'nullable|string|max:20', 'sort_order' => 'integer|min:0',
            'active' => 'boolean',
            'role_ids' => 'nullable|array', 'role_ids.*' => 'integer|exists:builder_roles,id',
        ]);
        if (($data['target_type'] ?? $item->target_type) === 'table') {
            $targetTable = $data['target_table'] ?? $item->target_table;
            abort_unless($targetTable && Schema::hasTable($targetTable), 422, 'La tabla seleccionada no existe.');
        }
        if (array_key_exists('role_ids', $data)) {
            $data['required_role_ids'] = $data['role_ids'];
            unset($data['role_ids']);
        }
        $item->update($data);

        return response()->json($item->fresh());
    }

    public function destroyItem(Request $request, BuilderMenu $menu, BuilderMenuItem $item): JsonResponse
    {
        abort_unless($menu->project_id === $request->project()->id && $item->menu_id === $menu->id, 404);
        $item->children()->delete();
        $item->delete();

        return response()->json(null, 204);
    }

    /** Rendered menu for the runtime sidebar, filtered by role ids passed as query. */
    public function render(Request $request): JsonResponse
    {
        $roleIds = array_map('intval', explode(',', (string) $request->query('roles', '')));
        $menus = $request->project()->menus()->with('items')->where('active', true)->orderBy('sort_order')->get();

        $filtered = $menus->map(function (BuilderMenu $menu) use ($roleIds) {
            $items = $menu->items->filter(function (BuilderMenuItem $item) use ($roleIds) {
                if (! $item->active) {
                    return false;
                }
                $required = $item->required_role_ids;
                if (is_array($required) && $required !== [] && empty(array_intersect($required, $roleIds))) {
                    return false;
                }

                return true;
            })->map(fn (BuilderMenuItem $i) => [
                'id' => $i->id, 'label' => $i->label, 'icon' => $i->icon, 'parent_id' => $i->parent_id,
                'target_type' => $i->target_type, 'target_id' => $i->target_id, 'target_table' => $i->target_table, 'url' => $i->url, 'badge' => $i->badge,
            ])->values();

            return ['id' => $menu->id, 'name' => $menu->name, 'slug' => $menu->slug, 'icon' => $menu->icon, 'items' => $items];
        })->filter(fn ($m) => $m['items'] !== [])->values();

        return response()->json($filtered);
    }

    public function reorderItems(Request $request, BuilderMenu $menu): JsonResponse
    {
        abort_unless($menu->project_id === $request->project()->id, 404);
        $data = $request->validate(['ids' => 'required|array', 'ids.*' => 'integer|exists:builder_menu_items,id']);
        DB::transaction(function () use ($data, $menu) {
            foreach (array_values($data['ids']) as $index => $id) {
                BuilderMenuItem::where('menu_id', $menu->id)->where('id', $id)->update(['sort_order' => $index]);
            }
        });

        return response()->json(['ok' => true]);
    }
}

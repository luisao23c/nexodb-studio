<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderPermission;
use App\Models\BuilderRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(BuilderRole::with('permissions')->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:60|unique:builder_roles,name',
            'description' => 'nullable|string|max:255', 'color' => 'nullable|string|max:9',
            'is_admin' => 'boolean',
        ]);
        $role = BuilderRole::create([...$data, 'slug' => Str::slug($data['name']), 'color' => $data['color'] ?? '#6d5dfc']);

        return response()->json($role->load('permissions'), 201);
    }

    public function update(Request $request, BuilderRole $role): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:60', Rule::unique('builder_roles')->ignore($role->id)],
            'description' => 'nullable|string|max:255', 'color' => 'nullable|string|max:9', 'is_admin' => 'boolean',
        ]);
        $role->update($data);

        return response()->json($role->fresh()->load('permissions'));
    }

    public function destroy(BuilderRole $role): JsonResponse
    {
        $role->delete();

        return response()->json(null, 204);
    }

    /** Replace a role's permissions for physical nx_ tables. */
    public function savePermissions(Request $request, BuilderRole $role): JsonResponse
    {
        $data = $request->validate([
            'permissions' => 'required|array',
            'permissions.*.table_name' => ['required', 'string', 'max:64', 'regex:/^nx_[a-zA-Z0-9_]+$/'],
            'permissions.*.can_read' => 'boolean', 'permissions.*.can_create' => 'boolean',
            'permissions.*.can_update' => 'boolean', 'permissions.*.can_delete' => 'boolean',
        ]);

        DB::transaction(function () use ($data, $role) {
            $role->permissions()->delete();
            foreach ($data['permissions'] as $perm) {
                abort_unless(Schema::hasTable($perm['table_name']), 422, "La tabla {$perm['table_name']} no existe.");
                if (! ($perm['can_read'] || $perm['can_create'] || $perm['can_update'] || $perm['can_delete'])) continue;
                BuilderPermission::create([
                    'role_id' => $role->id, 'table_name' => $perm['table_name'],
                    'can_read' => (bool) ($perm['can_read'] ?? false),
                    'can_create' => (bool) ($perm['can_create'] ?? false),
                    'can_update' => (bool) ($perm['can_update'] ?? false),
                    'can_delete' => (bool) ($perm['can_delete'] ?? false),
                ]);
            }
        });

        return response()->json($role->fresh()->load('permissions'));
    }
}

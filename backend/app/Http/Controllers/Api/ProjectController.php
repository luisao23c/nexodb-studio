<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Project::orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => 'required|string|max:100']);
        $project = Project::create([
            'name' => $data['name'],
            'slug' => $this->uniqueSlug($data['name']),
            'is_public' => false,
            'active' => true,
        ]);

        return response()->json($project, 201);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'icon' => 'nullable|string|max:50',
            'is_public' => 'boolean',
            'active' => 'boolean',
        ]);
        $project->update($data);

        return response()->json($project->fresh());
    }

    public function destroy(Project $project): JsonResponse
    {
        abort_if(Project::count() <= 1, 422, 'No se puede eliminar el último proyecto.');
        $project->delete();

        return response()->json(null, 204);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'proyecto';
        $slug = $base;
        $i = 2;
        while (Project::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}

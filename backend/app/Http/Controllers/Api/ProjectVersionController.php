<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectVersion;
use App\Services\ProjectSnapshotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ProjectVersionController extends Controller
{
    public function __construct(private ProjectSnapshotService $snapshots) {}

    public function index(Project $project): JsonResponse
    {
        return response()->json($project->versions()->get());
    }

    public function show(Project $project, ProjectVersion $version): JsonResponse
    {
        $this->assertProject($project, $version);
        return response()->json($version->makeVisible('snapshot'));
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'version' => ['nullable', 'string', 'max:30', 'regex:/^\d+(\.\d+){0,2}$/'],
            'bump' => 'nullable|in:auto,major,minor,patch',
            'label' => 'nullable|string|max:140',
            'notes' => 'nullable|string|max:2000',
        ]);
        $snapshot = $this->snapshots->capture($project);
        $hash = $this->snapshots->hash($snapshot);
        $latest = $project->versions()->first();
        if ($latest && $latest->snapshot_hash === $hash) {
            throw ValidationException::withMessages(['version' => 'No hay cambios nuevos desde la última versión.']);
        }

        [$major, $minor, $patch] = $this->nextVersion($data['version'] ?? null, $data['bump'] ?? 'auto', $latest, $snapshot);
        $versionName = "{$major}.{$minor}.{$patch}";
        if ($project->versions()->where('version', $versionName)->exists()) {
            throw ValidationException::withMessages(['version' => "La versión {$versionName} ya existe."]);
        }

        $version = $project->versions()->create([
            'version' => $versionName,
            'major' => $major,
            'minor' => $minor,
            'patch' => $patch,
            'label' => $data['label'] ?? null,
            'notes' => $data['notes'] ?? null,
            'snapshot' => $snapshot,
            'change_summary' => $this->snapshots->summary($snapshot, $latest?->snapshot),
            'snapshot_hash' => $hash,
        ]);

        return response()->json($version, 201);
    }

    public function restore(Project $project, ProjectVersion $version): JsonResponse
    {
        $this->assertProject($project, $version);
        $current = $this->snapshots->capture($project);
        $currentHash = $this->snapshots->hash($current);
        if ($currentHash === $version->snapshot_hash) return response()->json(['ok' => true, 'message' => 'Esta versión ya está activa.']);

        $latest = $project->versions()->first();
        if (! $latest || $latest->snapshot_hash !== $currentHash) {
            $major = $latest?->major ?? 1;
            $minor = $latest?->minor ?? 0;
            $patch = ($latest?->patch ?? -1) + 1;
            $project->versions()->create([
                'version' => "{$major}.{$minor}.{$patch}", 'major' => $major, 'minor' => $minor, 'patch' => $patch,
                'label' => 'Respaldo automático antes de restaurar', 'snapshot' => $current,
                'change_summary' => $this->snapshots->summary($current, $latest?->snapshot),
                'snapshot_hash' => $currentHash,
            ]);
        }

        $this->snapshots->restore($project, $version->snapshot);
        $version->update(['restored_at' => now()]);

        return response()->json(['ok' => true, 'message' => "Versión {$version->version} restaurada."]);
    }

    public function publish(Project $project, ProjectVersion $version): JsonResponse
    {
        $this->assertProject($project, $version);
        $project->versions()->update(['is_published' => false]);
        $version->update(['is_published' => true]);
        $project->update(['is_public' => true]);

        return response()->json($version->fresh());
    }

    public function destroy(Project $project, ProjectVersion $version): JsonResponse
    {
        $this->assertProject($project, $version);
        abort_if($version->is_published, 422, 'No puedes eliminar la versión publicada.');
        $version->delete();
        return response()->json(null, 204);
    }

    private function nextVersion(?string $requested, string $bump, ?ProjectVersion $latest, array $snapshot): array
    {
        if ($requested) {
            $parts = array_map('intval', explode('.', $requested));
            return [$parts[0], $parts[1] ?? 0, $parts[2] ?? 0];
        }
        if (! $latest) return [1, 0, 0];
        if ($bump === 'auto') $bump = $this->snapshots->hasStructuralChanges($snapshot, $latest->snapshot) ? 'minor' : 'patch';
        return match ($bump) {
            'major' => [$latest->major + 1, 0, 0],
            'minor' => [$latest->major, $latest->minor + 1, 0],
            default => [$latest->major, $latest->minor, $latest->patch + 1],
        };
    }

    private function assertProject(Project $project, ProjectVersion $version): void
    {
        abort_unless($version->project_id === $project->id, 404);
    }
}

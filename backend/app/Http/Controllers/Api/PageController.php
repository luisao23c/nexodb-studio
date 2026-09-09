<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PageController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(BuilderPage::orderBy('name')->get(['id', 'name', 'slug', 'description', 'active', 'created_at']));
    }

    public function show(BuilderPage $page): JsonResponse
    {
        return response()->json($page);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => 'required|string|max:80', 'description' => 'nullable|string|max:255', 'code' => 'nullable|string|max:60000']);
        $page = BuilderPage::create([
            'name' => $data['name'], 'slug' => Str::slug($data['name']),
            'description' => $data['description'] ?? null, 'code' => $data['code'] ?? $this->starterCode($data['name']),
        ]);

        return response()->json($page, 201);
    }

    public function update(Request $request, BuilderPage $page): JsonResponse
    {
        $data = $request->validate(['name' => 'sometimes|string|max:80', 'description' => 'nullable|string|max:255', 'code' => 'nullable|string|max:60000', 'active' => 'boolean']);
        $page->update($data);

        return response()->json($page->fresh());
    }

    public function destroy(BuilderPage $page): JsonResponse
    {
        $page->delete();

        return response()->json(null, 204);
    }

    private function starterCode(string $name): string
    {
        $title = htmlspecialchars($name);
        $slug = Str::slug($name);

        return <<<HTML
<div class="nx-page" id="page-{$slug}">
  <h1>{$title}</h1>
  <p>Edita este HTML y presiona Guardar para verlo en tu página.</p>
  <button id="btn-{$slug}" class="nx-btn">Acción</button>
  <p id="out-{$slug}"></p>
</div>
<style>
.nx-page { font-family: 'DM Sans', sans-serif; padding: 8px; }
.nx-btn { background: #6d5dfc; color: white; border: 0; padding: 10px 16px; border-radius: 9px; cursor: pointer; font-weight: 700; }
</style>
<script>
document.getElementById('btn-{$slug}')?.addEventListener('click', function () {
  document.getElementById('out-{$slug}').textContent = '¡Hola desde {$title}!';
});
</script>
HTML;
    }
}

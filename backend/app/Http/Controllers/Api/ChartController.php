<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderChart;
use App\Support\SafeIdentifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ChartController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->project()->charts()->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json($request->project()->charts()->create($this->validated($request)), 201);
    }

    public function update(Request $request, BuilderChart $chart): JsonResponse
    {
        abort_unless($chart->project_id === $request->project()->id, 404);
        $chart->update($this->validated($request));

        return response()->json($chart->fresh());
    }

    public function destroy(Request $request, BuilderChart $chart): JsonResponse
    {
        abort_unless($chart->project_id === $request->project()->id, 404);
        $chart->delete();

        return response()->json(null, 204);
    }

    public function data(BuilderChart $chart): JsonResponse
    {
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

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:80',
            'table_name' => 'required|string|max:64',
            'chart_type' => ['required', Rule::in(['bar', 'line', 'area', 'pie', 'donut'])],
            'label_field' => 'required|string|max:64', 'value_field' => 'nullable|string|max:64',
            'aggregate' => ['required', Rule::in(['count', 'sum', 'avg', 'min', 'max'])],
            'sort_direction' => ['required', Rule::in(['asc', 'desc'])],
            'limit' => 'integer|min:1|max:50', 'color' => 'nullable|string|max:9', 'active' => 'boolean',
        ]);
        $this->assertSafeTable($data['table_name']);
        $columns = Schema::getColumnListing($data['table_name']);
        abort_unless(in_array($data['label_field'], $columns, true), 422, 'Campo de etiqueta inválido.');
        if (($data['value_field'] ?? '') !== '') {
            abort_unless(in_array($data['value_field'], $columns, true), 422, 'Campo de valor inválido.');
        }

        return $data;
    }

    private function assertSafeTable(string $table): void
    {
        if (! SafeIdentifier::tableExists($table)) {
            throw ValidationException::withMessages(['table_name' => 'La tabla seleccionada no es válida.']);
        }
    }
}

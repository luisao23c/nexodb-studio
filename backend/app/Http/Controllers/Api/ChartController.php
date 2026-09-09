<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderChart;
use App\Models\BuilderField;
use App\Models\BuilderModule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ChartController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(BuilderChart::with('module:id,name,table_name')->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $chart = BuilderChart::create($data);

        return response()->json($chart->load('module:id,name,table_name'), 201);
    }

    public function update(Request $request, BuilderChart $chart): JsonResponse
    {
        $data = $this->validated($request, false);
        $chart->update($data);

        return response()->json($chart->fresh()->load('module:id,name,table_name'));
    }

    public function destroy(BuilderChart $chart): JsonResponse
    {
        $chart->delete();

        return response()->json(null, 204);
    }

    public function data(BuilderChart $chart): JsonResponse
    {
        $module = $chart->module;
        $table = $module->table_name;
        $labelField = $chart->label_field;
        $validColumns = $module->fields->pluck('name')->push('id')->all();
        abort_if(! in_array($labelField, $validColumns, true), 422, 'Campo de etiqueta inválido.');

        if ($chart->aggregate === 'count') {
            $rows = DB::table($table)
                ->select(DB::raw("`{$labelField}` as label"), DB::raw('COUNT(*) as value'))
                ->groupBy($labelField)
                ->orderBy('value', $chart->sort_direction)
                ->limit(min($chart->limit, 50))
                ->get();
        } else {
            $valueField = (string) $chart->value_field;
            abort_if($valueField === '' || ! in_array($valueField, $validColumns, true), 422, 'Campo de valor inválido.');
            $agg = $chart->aggregate === 'avg' ? 'AVG' : ($chart->aggregate === 'min' ? 'MIN' : ($chart->aggregate === 'max' ? 'MAX' : 'SUM'));
            $rows = DB::table($table)
                ->select(DB::raw("`{$labelField}` as label"), DB::raw("{$agg}(`{$valueField}`) as value"))
                ->groupBy($labelField)
                ->orderBy('value', $chart->sort_direction)
                ->limit(min($chart->limit, 50))
                ->get();
        }

        // Resolve relation labels when the label field is a relation column.
        $relationField = $module->fields->firstWhere('name', $labelField);
        if ($relationField && $relationField->data_type === 'relation') {
            $display = $relationField->display_column ?: ($relationField->relatedModule?->fields()->whereIn('data_type', ['string', 'text'])->orderBy('sort_order')->value('name') ?: 'id');
            $rows = $rows->map(function ($row) use ($relationField, $display) {
                if (is_numeric($row->label) && $row->label !== null) {
                    $row->label = DB::table($relationField->relatedModule->table_name)->where('id', $row->label)->value($display) ?? $row->label;
                }

                return $row;
            });
        }

        return response()->json([
            'chart' => $chart->only(['id', 'name', 'chart_type', 'color']),
            'data' => $rows->map(fn ($r) => ['label' => (string) $r->label, 'value' => (float) $r->value]),
        ]);
    }

    private function validated(Request $request, bool $creating = true): array
    {
        $rules = [
            'name' => 'required|string|max:80',
            'module_id' => 'required|integer|exists:builder_modules,id',
            'chart_type' => ['required', Rule::in(['bar', 'line', 'area', 'pie', 'donut'])],
            'label_field' => 'required|string|max:60',
            'value_field' => 'nullable|string|max:60',
            'aggregate' => ['required', Rule::in(['count', 'sum', 'avg', 'min', 'max'])],
            'sort_direction' => ['required', Rule::in(['asc', 'desc'])],
            'limit' => 'integer|min:1|max:50', 'color' => 'nullable|string|max:9', 'active' => 'boolean',
        ];
        $data = $request->validate($rules);
        $module = BuilderModule::findOrFail($data['module_id']);
        $valid = $module->fields->pluck('name')->push('id')->all();
        abort_if(! in_array($data['label_field'], $valid, true), 422, 'Campo de etiqueta inválido.');
        if (($data['value_field'] ?? '') !== '') {
            abort_if(! in_array($data['value_field'], $valid, true), 422, 'Campo de valor inválido.');
        }

        return $data;
    }
}

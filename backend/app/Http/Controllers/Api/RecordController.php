<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderField;
use App\Models\BuilderModule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RecordController extends Controller
{
    public function index(Request $request, BuilderModule $module): JsonResponse
    {
        $fields = $module->fields()->get();
        $query = DB::table($module->table_name);
        if ($search = trim((string) $request->query('search'))) {
            $searchable = $fields->where('searchable', true);
            if ($searchable->isNotEmpty()) $query->where(function ($q) use ($searchable, $search) {
                foreach ($searchable as $index => $field) {
                    $method = $index === 0 ? 'where' : 'orWhere';
                    $q->{$method}($field->name, 'like', "%{$search}%");
                }
            });
        }
        $allowedSorts = $fields->where('show_in_table', true)->pluck('name')->push('id')->all();
        $sort = in_array($request->query('sort'), $allowedSorts, true) ? $request->query('sort') : 'id';
        $direction = $request->query('direction') === 'asc' ? 'asc' : 'desc';
        $page = $query->orderBy($sort, $direction)->paginate(min((int) $request->query('per_page', 15), 100));
        $page->setCollection($page->getCollection()->map(fn ($row) => $this->decorateRow((array) $row, $fields)));
        return response()->json($page);
    }

    public function store(Request $request, BuilderModule $module): JsonResponse
    {
        $fields = $module->fields()->where('show_in_form', true)->get();
        $data = $request->validate($this->rules($fields));
        $id = DB::table($module->table_name)->insertGetId([...$this->normalize($data, $fields), 'created_at'=>now(), 'updated_at'=>now()]);
        return response()->json(DB::table($module->table_name)->find($id), 201);
    }

    public function show(BuilderModule $module, int $record): JsonResponse
    {
        $row = DB::table($module->table_name)->find($record);
        abort_unless($row, 404);
        return response()->json($row);
    }

    public function update(Request $request, BuilderModule $module, int $record): JsonResponse
    {
        abort_unless(DB::table($module->table_name)->where('id',$record)->exists(), 404);
        $fields = $module->fields()->where('show_in_form', true)->get();
        $data = $request->validate($this->rules($fields, $record));
        DB::table($module->table_name)->where('id',$record)->update([...$this->normalize($data, $fields), 'updated_at'=>now()]);
        return response()->json(DB::table($module->table_name)->find($record));
    }

    public function destroy(BuilderModule $module, int $record): JsonResponse
    {
        abort_unless(DB::table($module->table_name)->where('id',$record)->delete(), 404);
        return response()->json(null, 204);
    }

    public function options(BuilderModule $module): JsonResponse
    {
        $label = $module->fields()->whereIn('data_type',['string','text'])->orderBy('sort_order')->value('name') ?: 'id';
        return response()->json(DB::table($module->table_name)->orderBy($label)->limit(100)->get(['id', DB::raw("{$label} as label")]));
    }

    private function rules($fields, ?int $recordId = null): array
    {
        return $fields->mapWithKeys(function (BuilderField $field) use ($recordId) {
            $rules = [$field->required ? 'required' : 'nullable'];
            $rules[] = match ($field->data_type) {
                'integer','relation' => 'integer', 'decimal' => 'numeric', 'boolean' => 'boolean',
                'date' => 'date', 'datetime' => 'date', default => 'string',
            };
            if ($field->unique) $rules[] = Rule::unique($field->module->table_name, $field->name)->ignore($recordId);
            if ($field->data_type === 'relation' && $field->relatedModule) $rules[] = Rule::exists($field->relatedModule->table_name, 'id');
            foreach ($field->validation_rules ?? [] as $rule) $rules[] = $rule;
            return [$field->name => $rules];
        })->all();
    }

    private function normalize(array $data, $fields): array
    {
        foreach ($fields as $field) if ($field->data_type === 'boolean' && array_key_exists($field->name, $data)) $data[$field->name] = (bool) $data[$field->name];
        return $data;
    }

    private function decorateRow(array $row, $fields): array
    {
        foreach ($fields->where('data_type','relation') as $field) {
            if (! $row[$field->name] || ! $field->relatedModule) continue;
            $display = $field->display_column ?: $field->relatedModule->fields()->whereIn('data_type',['string','text'])->orderBy('sort_order')->value('name') ?: 'id';
            $row[$field->name.'_display'] = DB::table($field->relatedModule->table_name)->where('id',$row[$field->name])->value($display);
        }
        return $row;
    }
}

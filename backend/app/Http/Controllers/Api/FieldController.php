<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderField;
use App\Models\BuilderModule;
use App\Services\AuditService;
use App\Services\DynamicTableService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class FieldController extends Controller
{
    public function __construct(private DynamicTableService $tables, private AuditService $audit) {}

    public function store(Request $request, BuilderModule $module): JsonResponse
    {
        $data = $request->validate([
            'name'=>'required|string|max:60', 'label'=>'required|string|max:80',
            'data_type'=>['required',Rule::in(DynamicTableService::DATA_TYPES)],
            'input_type'=>['required',Rule::in(DynamicTableService::INPUT_TYPES)],
            'length'=>'nullable|integer|min:1|max:1000', 'nullable'=>'boolean', 'unique'=>'boolean',
            'default_value'=>'nullable|string|max:255', 'required'=>'boolean', 'show_in_table'=>'boolean',
            'show_in_form'=>'boolean', 'searchable'=>'boolean', 'sort_order'=>'nullable|integer|min:0',
            'related_module_id'=>'nullable|required_if:data_type,relation|exists:builder_modules,id',
            'display_column'=>'nullable|string|max:60', 'options'=>'nullable|array', 'options.*'=>'string|max:100',
            'validation_rules'=>'nullable|array', 'validation_rules.*'=>'string|max:80',
            'format'=>['nullable',Rule::in(['none','currency','number','percent','date','datetime','time','uppercase','lowercase','capitalize','badge','email','phone','link','image','color','stars','progress','truncate','json','relative_time'])],
            'format_config'=>'nullable|array',
        ]);
        $data['name'] = $this->tables->safeColumnName($data['name']);
        $this->validateDisplayColumn($data);
        if (Schema::hasColumn($module->table_name, $data['name'])) return response()->json(['message'=>'El campo ya existe.'], 422);

        // DDL implícitamente confirma en MySQL: primero la columna física, luego el metadato.
        $this->tables->addColumn($module, new BuilderField($data));
        $field = $module->fields()->create($data);
        $this->audit->log('field.create', 'column', "{$module->table_name}.{$data['name']}");
        return response()->json($field->load('relatedModule:id,name,table_name'), 201);
    }

    public function update(Request $request, BuilderModule $module, BuilderField $field): JsonResponse
    {
        abort_unless($field->module_id === $module->id, 404);
        $data = $request->validate([
            'label'=>'sometimes|required|string|max:80', 'input_type'=>['sometimes',Rule::in(DynamicTableService::INPUT_TYPES)],
            'required'=>'boolean', 'show_in_table'=>'boolean', 'show_in_form'=>'boolean', 'searchable'=>'boolean',
            'sort_order'=>'integer|min:0', 'display_column'=>'nullable|string|max:60', 'options'=>'nullable|array',
            'validation_rules'=>'nullable|array', 'validation_rules.*'=>'string|max:80',
            'format'=>['nullable',Rule::in(['none','currency','number','percent','date','datetime','time','uppercase','lowercase','capitalize','badge','email','phone','link','image','color','stars','progress','truncate','json','relative_time'])],
            'format_config'=>'nullable|array',
        ]);
        if (array_key_exists('display_column', $data) && $field->related_module_id) {
            $this->validateDisplayColumn(['data_type'=>'relation','related_module_id'=>$field->related_module_id,'display_column'=>$data['display_column']]);
        }
        $field->update($data);
        return response()->json($field->fresh()->load('relatedModule:id,name,table_name'));
    }

    /** Modify the physical column (type, length, nullable, default, unique) of a field. */
    public function modify(Request $request, BuilderModule $module, BuilderField $field, DynamicTableService $tables): JsonResponse
    {
        abort_unless($field->module_id === $module->id, 404);
        $data = $request->validate([
            'data_type'=>['required',Rule::in(DynamicTableService::DATA_TYPES)],
            'length'=>'nullable|integer|min:1|max:1000', 'nullable'=>'boolean',
            'default_value'=>'nullable|string|max:255', 'unique'=>'boolean',
        ]);
        $tables->modifyColumn($module->table_name, $field->name, [
            'data_type'=>$data['data_type'], 'length'=>$data['length'] ?? null,
            'nullable'=>$data['nullable'] ?? true, 'default_value'=>$data['default_value'] ?? null,
            'unique'=>$data['unique'] ?? false,
        ]);
        $field->update(['data_type'=>$data['data_type'], 'length'=>$data['length'] ?? null,
            'nullable'=>$data['nullable'] ?? true, 'default_value'=>$data['default_value'] ?? null,
            'unique'=>$data['unique'] ?? false]);
        return response()->json($field->fresh()->load('relatedModule:id,name,table_name'));
    }

    /** Rename a field (metadata + physical column). */
    public function rename(Request $request, BuilderModule $module, BuilderField $field, DynamicTableService $tables): JsonResponse
    {
        abort_unless($field->module_id === $module->id, 404);
        $data = $request->validate(['name'=>'required|string|max:60']);
        $new = $tables->safeColumnName($data['name']);
        abort_if(Schema::hasColumn($module->table_name, $new) && $new !== $field->name, 422, 'Ya existe una columna con ese nombre.');
        if ($new !== $field->name) {
            $tables->renameColumn($module->table_name, $field->name, $new);
            $field->update(['name'=>$new]);
        }
        return response()->json($field->fresh()->load('relatedModule:id,name,table_name'));
    }

    /** Drop the physical column and the metadata row. */
    public function destroy(BuilderModule $module, BuilderField $field, DynamicTableService $tables): JsonResponse
    {
        abort_unless($field->module_id === $module->id, 404);
        if ($field->data_type === 'relation') {
            return response()->json(['message'=>'No se puede eliminar un campo de relación desde aquí. Elimina el módulo o contacta al administrador.'], 422);
        }
        $tables->dropColumn($module->table_name, $field->name);
        $field->delete();
        return response()->json(null, 204);
    }

    private function validateDisplayColumn(array $data): void
    {
        if (($data['data_type'] ?? null) !== 'relation' || empty($data['display_column'])) return;
        $related = BuilderModule::findOrFail($data['related_module_id']);
        if (! $related->fields()->where('name', $data['display_column'])->exists()) {
            throw \Illuminate\Validation\ValidationException::withMessages(['display_column'=>'El campo visible no existe en el módulo relacionado.']);
        }
    }
}

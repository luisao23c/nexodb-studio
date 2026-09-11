<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderForm;
use App\Models\BuilderView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InterfaceBuilderController extends Controller
{
    private const FIELD_TYPES = ['text', 'textarea', 'number', 'email', 'password', 'date', 'datetime', 'autocomplete', 'select', 'multiselect', 'checkbox', 'radio', 'switch', 'file', 'hidden', 'heading', 'divider', 'button'];

    private const DISPLAY_TYPES = ['text', 'number', 'money', 'date', 'datetime', 'badge', 'boolean', 'image', 'link', 'email', 'json'];

    public function forms(Request $request): JsonResponse
    {
        return response()->json($request->project()->forms()->with('fields')->orderBy('name')->get());
    }

    public function storeForm(Request $request): JsonResponse
    {
        return $this->saveForm($request, new BuilderForm(['project_id' => $request->project()->id]), 201);
    }

    public function formByKey(Request $request, string $key): JsonResponse
    {
        return response()->json($request->project()->forms()->with('fields')->where('form_key', $key)->firstOrFail());
    }

    public function updateForm(Request $request, BuilderForm $form): JsonResponse
    {
        abort_unless($form->project_id === $request->project()->id, 404);

        return $this->saveForm($request, $form);
    }

    public function destroyForm(Request $request, BuilderForm $form): JsonResponse
    {
        abort_unless($form->project_id === $request->project()->id, 404);
        $form->delete();

        return response()->json(null, 204);
    }

    public function views(Request $request): JsonResponse
    {
        return response()->json($request->project()->views()->with('columns')->orderBy('name')->get());
    }

    public function storeView(Request $request): JsonResponse
    {
        return $this->saveView($request, new BuilderView(['project_id' => $request->project()->id]), 201);
    }

    public function viewByKey(Request $request, string $key): JsonResponse
    {
        return response()->json($request->project()->views()->with('columns')->where('view_key', $key)->firstOrFail());
    }

    public function updateView(Request $request, BuilderView $view): JsonResponse
    {
        abort_unless($view->project_id === $request->project()->id, 404);

        return $this->saveView($request, $view);
    }

    public function destroyView(Request $request, BuilderView $view): JsonResponse
    {
        abort_unless($view->project_id === $request->project()->id, 404);
        $view->delete();

        return response()->json(null, 204);
    }

    public function lookup(Request $request, string $table): JsonResponse
    {
        abort_unless(preg_match('/^[a-zA-Z0-9_]+$/', $table) && Schema::hasTable($table), 404, 'Tabla no encontrada.');

        $data = $request->validate([
            'value_column' => ['required', 'string', 'regex:/^[a-zA-Z0-9_]+$/'],
            'label_column' => ['required', 'string', 'regex:/^[a-zA-Z0-9_]+$/'],
            'search' => 'nullable|string|max:100',
        ]);
        abort_unless(Schema::hasColumn($table, $data['value_column']) && Schema::hasColumn($table, $data['label_column']), 422, 'Las columnas de la relación no existen.');

        $query = DB::table($table)
            ->select([$data['value_column'], $data['label_column']])
            ->whereNotNull($data['value_column'])
            ->whereNotNull($data['label_column']);
        if (! empty($data['search'])) {
            $query->where($data['label_column'], 'like', '%'.$data['search'].'%');
        }

        $options = $query->orderBy($data['label_column'])->limit(30)->get()->map(fn ($row) => [
            'value' => $row->{$data['value_column']},
            'label' => (string) $row->{$data['label_column']},
        ]);

        return response()->json($options);
    }

    private function saveForm(Request $request, BuilderForm $form, int $status = 200): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'form_key' => ['required', 'regex:/^[a-z][a-z0-9_.-]*$/', 'max:100', Rule::unique('builder_forms', 'form_key')->where('project_id', $request->project()->id)->ignore($form->id)],
            'table_name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'layout_columns' => 'required|integer|between:1,12',
            'submit_label' => 'required|string|max:60',
            'settings' => 'nullable|array',
            'active' => 'boolean',
            'fields' => 'required|array|min:1|max:100',
            'fields.*.field_key' => 'required|string|max:100|distinct',
            'fields.*.label' => 'required|string|max:100',
            'fields.*.field_type' => ['required', Rule::in(self::FIELD_TYPES)],
            'fields.*.source_column' => 'nullable|string|max:100',
            'fields.*.placeholder' => 'nullable|string|max:255',
            'fields.*.help_text' => 'nullable|string|max:255',
            'fields.*.default_value' => 'nullable|string|max:2000',
            'fields.*.width' => 'required|integer|between:1,12',
            'fields.*.required' => 'boolean',
            'fields.*.options' => 'nullable|array',
            'fields.*.config' => 'nullable|array',
        ]);

        $this->validateFormReferences($data);

        DB::transaction(function () use ($form, $data) {
            $form->fill(collect($data)->except('fields')->all())->save();
            $form->fields()->delete();
            foreach ($data['fields'] as $index => $field) {
                $form->fields()->create($field + ['sort_order' => $index]);
            }
        });

        return response()->json($form->fresh('fields'), $status);
    }

    private function validateFormReferences(array $data): void
    {
        if (! Schema::hasTable($data['table_name'])) {
            throw ValidationException::withMessages(['table_name' => 'La tabla destino ya no existe.']);
        }

        foreach ($data['fields'] as $index => $field) {
            if (! empty($field['source_column']) && ! Schema::hasColumn($data['table_name'], $field['source_column'])) {
                throw ValidationException::withMessages(["fields.$index.source_column" => 'La columna vinculada no existe en la tabla destino.']);
            }
            $config = $field['config'] ?? [];
            if (($config['options_source'] ?? 'static') !== 'relation') {
                continue;
            }
            $relationTable = $config['relation_table'] ?? '';
            $valueColumn = $config['relation_value_column'] ?? '';
            $labelColumn = $config['relation_label_column'] ?? '';
            if (! $relationTable || ! $valueColumn || ! $labelColumn) {
                throw ValidationException::withMessages(["fields.$index.config" => 'Completa la tabla, el valor ID y el campo visible de la relación.']);
            }
            if (! Schema::hasTable($relationTable) || ! Schema::hasColumns($relationTable, [$valueColumn, $labelColumn])) {
                throw ValidationException::withMessages(["fields.$index.config" => 'La referencia configurada no existe en la base de datos.']);
            }
        }
    }

    private function saveView(Request $request, BuilderView $view, int $status = 200): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'view_key' => ['required', 'regex:/^[a-z][a-z0-9_.-]*$/', 'max:100', Rule::unique('builder_views', 'view_key')->where('project_id', $request->project()->id)->ignore($view->id)],
            'table_name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'primary_key' => 'required|string|max:100',
            'default_sort_column' => 'nullable|string|max:100',
            'default_sort_direction' => ['required', Rule::in(['asc', 'desc'])],
            'per_page' => 'required|integer|between:5,100',
            'settings' => 'nullable|array',
            'active' => 'boolean',
            'columns' => 'required|array|min:1|max:100',
            'columns.*.column_key' => 'required|string|max:100|distinct',
            'columns.*.label' => 'required|string|max:100',
            'columns.*.display_type' => ['required', Rule::in(self::DISPLAY_TYPES)],
            'columns.*.width' => 'nullable|integer|between:60,600',
            'columns.*.sortable' => 'boolean',
            'columns.*.searchable' => 'boolean',
            'columns.*.visible' => 'boolean',
            'columns.*.config' => 'nullable|array',
        ]);

        DB::transaction(function () use ($view, $data) {
            $view->fill(collect($data)->except('columns')->all())->save();
            $view->columns()->delete();
            foreach ($data['columns'] as $index => $column) {
                $view->columns()->create($column + ['sort_order' => $index]);
            }
        });

        return response()->json($view->fresh('columns'), $status);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderForm;
use App\Models\BuilderView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InterfaceBuilderController extends Controller
{
    private const FIELD_TYPES = ['text', 'textarea', 'number', 'email', 'password', 'date', 'datetime', 'autocomplete', 'select', 'multiselect', 'checkbox', 'radio', 'switch', 'file', 'hidden', 'heading', 'divider', 'button'];
    private const DISPLAY_TYPES = ['text', 'number', 'money', 'date', 'datetime', 'badge', 'boolean', 'image', 'link', 'email', 'json'];

    public function forms(): JsonResponse
    {
        return response()->json(BuilderForm::with('fields')->orderBy('name')->get());
    }

    public function storeForm(Request $request): JsonResponse
    {
        return $this->saveForm($request, new BuilderForm, 201);
    }

    public function formByKey(string $key): JsonResponse
    {
        return response()->json(BuilderForm::with('fields')->where('form_key', $key)->firstOrFail());
    }

    public function updateForm(Request $request, BuilderForm $form): JsonResponse
    {
        return $this->saveForm($request, $form);
    }

    public function destroyForm(BuilderForm $form): JsonResponse
    {
        $form->delete();
        return response()->json(null, 204);
    }

    public function views(): JsonResponse
    {
        return response()->json(BuilderView::with('columns')->orderBy('name')->get());
    }

    public function storeView(Request $request): JsonResponse
    {
        return $this->saveView($request, new BuilderView, 201);
    }

    public function viewByKey(string $key): JsonResponse
    {
        return response()->json(BuilderView::with('columns')->where('view_key', $key)->firstOrFail());
    }

    public function updateView(Request $request, BuilderView $view): JsonResponse
    {
        return $this->saveView($request, $view);
    }

    public function destroyView(BuilderView $view): JsonResponse
    {
        $view->delete();
        return response()->json(null, 204);
    }

    private function saveForm(Request $request, BuilderForm $form, int $status = 200): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'form_key' => ['required', 'regex:/^[a-z][a-z0-9_.-]*$/', 'max:100', Rule::unique('builder_forms', 'form_key')->ignore($form->id)],
            'table_name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'layout_columns' => 'required|integer|between:1,3',
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

        DB::transaction(function () use ($form, $data) {
            $form->fill(collect($data)->except('fields')->all())->save();
            $form->fields()->delete();
            foreach ($data['fields'] as $index => $field) {
                $form->fields()->create($field + ['sort_order' => $index]);
            }
        });

        return response()->json($form->fresh('fields'), $status);
    }

    private function saveView(Request $request, BuilderView $view, int $status = 200): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'view_key' => ['required', 'regex:/^[a-z][a-z0-9_.-]*$/', 'max:100', Rule::unique('builder_views', 'view_key')->ignore($view->id)],
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

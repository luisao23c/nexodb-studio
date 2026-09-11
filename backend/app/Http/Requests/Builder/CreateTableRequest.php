<?php

namespace App\Http\Requests\Builder;

use App\Services\DynamicTableService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateTableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:60',
            'columns' => 'nullable|array|max:30',
            'columns.*.name' => 'required|string|max:60',
            'columns.*.data_type' => ['required', Rule::in(DynamicTableService::DATA_TYPES)],
            'columns.*.length' => 'nullable|integer|min:1|max:65535',
            'columns.*.nullable' => 'boolean',
            'columns.*.unique' => 'boolean',
            'columns.*.unsigned' => 'boolean',
            'columns.*.default_value' => 'nullable|string|max:255',
            'columns.*.comment' => 'nullable|string|max:255',
            'columns.*.enum_values' => 'nullable|string|max:500',
            'add_timestamps' => 'boolean',
            'add_soft_deletes' => 'boolean',
            'use_uuid_pk' => 'boolean',
            'engine' => ['nullable', Rule::in(['InnoDB', 'MyISAM'])],
            'charset' => ['nullable', Rule::in(['utf8mb4', 'utf8', 'latin1', 'ascii'])],
            'collation' => ['nullable', Rule::in(['utf8mb4_unicode_ci', 'utf8mb4_general_ci', 'utf8mb4_bin', 'utf8_general_ci'])],
        ];
    }
}

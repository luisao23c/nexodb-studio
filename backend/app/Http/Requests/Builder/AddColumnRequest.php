<?php

namespace App\Http\Requests\Builder;

use App\Services\DynamicTableService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddColumnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:60',
            'data_type' => ['required', Rule::in(DynamicTableService::DATA_TYPES)],
            'length' => 'nullable|integer|min:1|max:65535',
            'nullable' => 'boolean',
            'default_value' => 'nullable|string|max:255',
            'unique' => 'boolean',
            'unsigned' => 'boolean',
            'comment' => 'nullable|string|max:255',
            'enum_values' => 'nullable|string|max:500',
        ];
    }
}

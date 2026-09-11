<?php

namespace App\Http\Requests\Builder;

use Illuminate\Foundation\Http\FormRequest;

class AddForeignKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'column' => 'required|string',
            'referenced_table' => 'required|string|regex:/^nx_[a-zA-Z0-9_]+$/',
            'referenced_column' => 'nullable|string',
            'on_delete' => 'nullable|string|in:CASCADE,RESTRICT,SET NULL,NO ACTION',
        ];
    }
}

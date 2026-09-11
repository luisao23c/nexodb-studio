<?php

namespace App\Http\Requests\Builder;

use Illuminate\Foundation\Http\FormRequest;

class AddIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'columns' => 'required|array|min:1',
            'columns.*' => ['string', 'max:64', 'regex:/^[a-zA-Z0-9_]+$/'],
            'unique' => 'boolean',
            'name' => ['nullable', 'string', 'max:64', 'regex:/^[a-zA-Z0-9_]+$/'],
        ];
    }
}

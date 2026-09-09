<?php

namespace App\Services;

use App\Models\BuilderField;
use App\Models\BuilderModule;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DynamicTableService
{
    public const PREFIX = 'nx_';
    public const DATA_TYPES = ['string','text','integer','decimal','boolean','date','datetime','relation'];
    public const INPUT_TYPES = ['text','textarea','number','email','date','datetime-local','checkbox','select','autocomplete','multiselect'];

    public function safeTableName(string $name): string
    {
        $table = self::PREFIX.Str::snake(Str::pluralStudly($name));
        if (! preg_match('/^nx_[a-z][a-z0-9_]{1,54}$/', $table)) {
            throw ValidationException::withMessages(['name' => 'El nombre no puede convertirse en una tabla segura.']);
        }
        return $table;
    }

    public function safeColumnName(string $name): string
    {
        $column = Str::snake($name);
        if (! preg_match('/^[a-z][a-z0-9_]{1,54}$/', $column) || in_array($column, ['id','created_at','updated_at'], true)) {
            throw ValidationException::withMessages(['name' => 'Nombre de campo inválido o reservado.']);
        }
        return $column;
    }

    public function createTable(BuilderModule $module): void
    {
        Schema::create($module->table_name, function (Blueprint $table) {
            $table->id(); $table->timestamps();
        });
    }

    public function addColumn(BuilderModule $module, BuilderField $field): void
    {
        Schema::table($module->table_name, function (Blueprint $table) use ($field) {
            $column = match ($field->data_type) {
                'string' => $table->string($field->name, $field->length ?: 255),
                'text' => $table->text($field->name),
                'integer' => $table->integer($field->name),
                'decimal' => $table->decimal($field->name, 15, 2),
                'boolean' => $table->boolean($field->name),
                'date' => $table->date($field->name),
                'datetime' => $table->dateTime($field->name),
                'relation' => $table->unsignedBigInteger($field->name),
                default => throw ValidationException::withMessages(['data_type' => 'Tipo de dato no permitido.']),
            };
            if ($field->nullable) $column->nullable();
            if ($field->unique) $column->unique();
            if ($field->default_value !== null && $field->default_value !== '') $column->default($this->castDefault($field));
            if ($field->data_type === 'relation') $table->index($field->name);
        });
    }

    private function castDefault(BuilderField $field): mixed
    {
        return match ($field->data_type) {
            'integer' => (int) $field->default_value,
            'decimal' => (float) $field->default_value,
            'boolean' => filter_var($field->default_value, FILTER_VALIDATE_BOOL),
            default => $field->default_value,
        };
    }
}

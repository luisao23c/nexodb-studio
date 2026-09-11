<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property string $field_key
 * @property string $field_type
 * @property string|null $source_column
 * @property bool $required
 * @property array|null $config
 */
class BuilderFormField extends Model
{
    protected $fillable = ['field_key', 'label', 'field_type', 'source_column', 'placeholder', 'help_text', 'default_value', 'width', 'required', 'options', 'config', 'sort_order'];

    protected $casts = ['options' => 'array', 'config' => 'array', 'required' => 'boolean', 'width' => 'integer'];
}

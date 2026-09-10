<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BuilderFormField extends Model
{
    protected $fillable = ['field_key', 'label', 'field_type', 'source_column', 'placeholder', 'help_text', 'default_value', 'width', 'required', 'options', 'config', 'sort_order'];
    protected $casts = ['options' => 'array', 'config' => 'array', 'required' => 'boolean', 'width' => 'integer'];
}

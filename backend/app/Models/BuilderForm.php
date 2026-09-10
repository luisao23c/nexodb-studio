<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderForm extends Model
{
    protected $fillable = ['name', 'form_key', 'table_name', 'description', 'layout_columns', 'submit_label', 'settings', 'active'];
    protected $casts = ['settings' => 'array', 'active' => 'boolean', 'layout_columns' => 'integer'];

    public function fields(): HasMany
    {
        return $this->hasMany(BuilderFormField::class, 'form_id')->orderBy('sort_order');
    }
}

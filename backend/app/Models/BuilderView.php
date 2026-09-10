<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderView extends Model
{
    protected $fillable = ['name', 'view_key', 'table_name', 'description', 'primary_key', 'default_sort_column', 'default_sort_direction', 'per_page', 'settings', 'active'];
    protected $casts = ['settings' => 'array', 'active' => 'boolean', 'per_page' => 'integer'];

    public function columns(): HasMany
    {
        return $this->hasMany(BuilderViewColumn::class, 'view_id')->orderBy('sort_order');
    }
}

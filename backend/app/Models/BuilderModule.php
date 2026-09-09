<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderModule extends Model
{
    protected $fillable = ['name', 'slug', 'table_name', 'description', 'icon', 'active'];
    protected $casts = ['active' => 'boolean'];
    public function fields(): HasMany { return $this->hasMany(BuilderField::class, 'module_id')->orderBy('sort_order'); }
}

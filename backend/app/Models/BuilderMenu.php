<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $project_id
 */
class BuilderMenu extends Model
{
    protected $fillable = ['project_id', 'name', 'slug', 'icon', 'sort_order', 'active'];

    protected $casts = ['active' => 'boolean'];

    public function items(): HasMany
    {
        return $this->hasMany(BuilderMenuItem::class, 'menu_id')->orderBy('sort_order');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderMenuItem extends Model
{
    protected $fillable = ['menu_id', 'parent_id', 'label', 'icon', 'target_type', 'target_id', 'url', 'badge', 'sort_order', 'active', 'required_role_ids'];
    protected $casts = ['active' => 'boolean', 'required_role_ids' => 'array'];

    public function menu(): BelongsTo
    {
        return $this->belongsTo(BuilderMenu::class, 'menu_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }
}

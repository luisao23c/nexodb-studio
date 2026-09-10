<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderRoute extends Model
{
    protected $table = 'nx_routes';
    protected $fillable = [
        'parent_id', 'name', 'slug', 'icon', 'sort_order',
        'content_type', 'content_config', 'layout',
        'active', 'visible_in_menu', 'badge_color', 'badge_label',
    ];
    protected $casts = [
        'content_config' => 'array',
        'active' => 'boolean',
        'visible_in_menu' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Informational only: permissions on this role are not enforced anywhere in the API.
 * Every request that carries the shared BUILDER_ADMIN_KEY can perform any action regardless
 * of what is configured here. Kept as labeling/documentation metadata for a single-user tool.
 */
class BuilderRole extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'color', 'is_admin'];

    protected $casts = ['is_admin' => 'boolean'];

    public function permissions(): HasMany
    {
        return $this->hasMany(BuilderPermission::class, 'role_id');
    }
}

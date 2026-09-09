<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderRole extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'color', 'is_admin'];
    protected $casts = ['is_admin' => 'boolean'];

    public function permissions(): HasMany
    {
        return $this->hasMany(BuilderPermission::class, 'role_id');
    }

    public function moduleIdsWith(string $action): array
    {
        if ($this->is_admin) {
            return BuilderModule::pluck('id')->all();
        }

        return $this->permissions()->where($action, true)->pluck('module_id')->all();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuilderPermission extends Model
{
    protected $fillable = ['role_id', 'table_name', 'can_read', 'can_create', 'can_update', 'can_delete'];
    protected $casts = ['can_read' => 'boolean', 'can_create' => 'boolean', 'can_update' => 'boolean', 'can_delete' => 'boolean'];

    public function role(): BelongsTo
    {
        return $this->belongsTo(BuilderRole::class, 'role_id');
    }
}

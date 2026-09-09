<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BuilderAuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = ['actor', 'action', 'target_type', 'target', 'sql_statement', 'meta', 'ip', 'created_at'];
    protected $casts = ['meta' => 'array', 'created_at' => 'datetime'];
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectVersion extends Model
{
    protected $fillable = ['project_id', 'version', 'major', 'minor', 'patch', 'label', 'notes', 'snapshot', 'change_summary', 'snapshot_hash', 'is_published', 'restored_at'];

    protected $hidden = ['snapshot'];

    protected $casts = [
        'snapshot' => 'array',
        'change_summary' => 'array',
        'is_published' => 'boolean',
        'restored_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}

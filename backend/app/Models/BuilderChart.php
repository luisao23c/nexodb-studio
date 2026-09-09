<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuilderChart extends Model
{
    protected $fillable = ['name', 'module_id', 'chart_type', 'label_field', 'value_field', 'aggregate', 'sort_direction', 'limit', 'color', 'active'];
    protected $casts = ['active' => 'boolean', 'limit' => 'integer'];

    public function module(): BelongsTo
    {
        return $this->belongsTo(BuilderModule::class, 'module_id');
    }
}

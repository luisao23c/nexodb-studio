<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $project_id
 */
class BuilderChart extends Model
{
    protected $fillable = ['project_id', 'name', 'table_name', 'chart_type', 'label_field', 'value_field', 'aggregate', 'sort_direction', 'limit', 'color', 'active'];

    protected $casts = ['active' => 'boolean', 'limit' => 'integer'];
}

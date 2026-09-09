<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BuilderChart extends Model
{
    protected $fillable = ['name', 'table_name', 'chart_type', 'label_field', 'value_field', 'aggregate', 'sort_direction', 'limit', 'color', 'active'];
    protected $casts = ['active' => 'boolean', 'limit' => 'integer'];

}

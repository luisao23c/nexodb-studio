<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BuilderViewColumn extends Model
{
    protected $fillable = ['column_key', 'label', 'display_type', 'width', 'sortable', 'searchable', 'visible', 'config', 'sort_order'];
    protected $casts = ['config' => 'array', 'sortable' => 'boolean', 'searchable' => 'boolean', 'visible' => 'boolean', 'width' => 'integer'];
}

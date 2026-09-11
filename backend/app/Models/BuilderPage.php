<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $project_id
 */
class BuilderPage extends Model
{
    protected $fillable = ['project_id', 'name', 'slug', 'description', 'code', 'active'];

    protected $casts = ['active' => 'boolean'];
}

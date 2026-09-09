<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BuilderPage extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'code', 'active'];
    protected $casts = ['active' => 'boolean'];
}

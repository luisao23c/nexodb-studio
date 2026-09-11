<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    protected $fillable = ['name', 'slug', 'icon', 'is_public', 'active'];

    protected $casts = [
        'is_public' => 'boolean',
        'active' => 'boolean',
    ];

    public function routes(): HasMany
    {
        return $this->hasMany(BuilderRoute::class, 'project_id');
    }

    public function menus(): HasMany
    {
        return $this->hasMany(BuilderMenu::class, 'project_id');
    }

    public function charts(): HasMany
    {
        return $this->hasMany(BuilderChart::class, 'project_id');
    }

    public function pages(): HasMany
    {
        return $this->hasMany(BuilderPage::class, 'project_id');
    }

    public function forms(): HasMany
    {
        return $this->hasMany(BuilderForm::class, 'project_id');
    }

    public function views(): HasMany
    {
        return $this->hasMany(BuilderView::class, 'project_id');
    }
}

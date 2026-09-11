<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $project_id
 * @property string $table_name
 * @property string|null $submit_label
 * @property Collection<int, BuilderFormField> $fields
 */
class BuilderForm extends Model
{
    protected $fillable = ['project_id', 'name', 'form_key', 'table_name', 'description', 'layout_columns', 'submit_label', 'settings', 'active'];

    protected $casts = ['settings' => 'array', 'active' => 'boolean', 'layout_columns' => 'integer'];

    public function fields(): HasMany
    {
        return $this->hasMany(BuilderFormField::class, 'form_id')->orderBy('sort_order');
    }
}

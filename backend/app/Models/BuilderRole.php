<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class BuilderRole extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'color', 'is_admin'];
    protected $casts = ['is_admin' => 'boolean'];

    public function permissions(): HasMany
    {
        return $this->hasMany(BuilderPermission::class, 'role_id');
    }

    public function tableNamesWith(string $action): array
    {
        if ($this->is_admin) {
            return collect(DB::select('SHOW TABLES'))->map(fn ($row) => (string) array_values((array) $row)[0])->filter(fn ($table) => str_starts_with($table, 'nx_'))->values()->all();
        }

        return $this->permissions()->where($action, true)->pluck('table_name')->all();
    }
}

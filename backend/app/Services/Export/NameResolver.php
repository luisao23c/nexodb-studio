<?php

namespace App\Services\Export;

use Illuminate\Support\Str;

/** Single place deriving PHP class names / URL segments from an `nx_` table name, so every generator agrees. */
class NameResolver
{
    public static function modelClass(string $table): string
    {
        return Str::studly(Str::singular(Str::after($table, 'nx_')));
    }

    public static function controllerClass(string $table): string
    {
        return self::modelClass($table).'Controller';
    }

    public static function requestClass(string $table): string
    {
        return self::modelClass($table).'Request';
    }

    /** kebab-case plural URL segment, e.g. nx_ordenes_items -> ordenes-items */
    public static function routeSegment(string $table): string
    {
        return Str::kebab(Str::after($table, 'nx_'));
    }

    /** camelCase relation method name for a belongsTo, derived from the FK column (categoria_id -> categoria). */
    public static function belongsToMethod(string $column): string
    {
        return Str::camel(preg_replace('/_id$/', '', $column) ?: $column);
    }

    /** camelCase relation method name for the reverse hasMany, derived from the owning table's base name. */
    public static function hasManyMethod(string $table): string
    {
        return Str::camel(Str::after($table, 'nx_'));
    }
}

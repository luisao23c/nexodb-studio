<?php

namespace App\Support;

use Illuminate\Support\Facades\Schema;

/** Single source of truth for validating nx_ table/column identifiers before they touch raw SQL/DDL. */
final class SafeIdentifier
{
    private const TABLE_PATTERN = '/^nx_[a-zA-Z0-9_]+$/';

    private const COLUMN_PATTERN = '/^[a-zA-Z0-9_]+$/';

    public static function isValidTableName(string $table): bool
    {
        return (bool) preg_match(self::TABLE_PATTERN, $table);
    }

    public static function isValidColumnName(string $column): bool
    {
        return (bool) preg_match(self::COLUMN_PATTERN, $column);
    }

    public static function tableExists(string $table): bool
    {
        return self::isValidTableName($table) && Schema::hasTable($table);
    }
}

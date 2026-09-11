<?php

namespace App\Services\Export;

use Illuminate\Support\Facades\DB;

/** Thin wrapper around the same MySQL introspection queries SchemaExplorerController uses, reusable outside a JSON response context. */
class SchemaIntrospector
{
    public function columns(string $table): array
    {
        return collect(DB::select("SHOW FULL COLUMNS FROM `{$table}`"))->map(fn ($column) => [
            'name' => $column->Field,
            'type' => $column->Type,
            'nullable' => $column->Null === 'YES',
            'key' => $column->Key ?: null,
            'default' => $column->Default,
            'extra' => $column->Extra ?: null,
        ])->values()->all();
    }

    public function indexes(string $table): array
    {
        return collect(DB::select("SHOW INDEX FROM `{$table}`"))->groupBy('Key_name')->map(fn ($rows, $key) => [
            'name' => $key,
            'unique' => ! (bool) $rows->first()->Non_unique,
            'columns' => $rows->sortBy('Seq_in_index')->pluck('Column_name')->all(),
        ])->values()->all();
    }

    public function foreignKeys(string $table): array
    {
        return collect(DB::select(
            'SELECT kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME, rc.DELETE_RULE
             FROM information_schema.KEY_COLUMN_USAGE kcu
             JOIN information_schema.REFERENTIAL_CONSTRAINTS rc USING (CONSTRAINT_NAME, CONSTRAINT_SCHEMA)
             WHERE kcu.CONSTRAINT_SCHEMA = DATABASE() AND kcu.TABLE_NAME = ? AND kcu.REFERENCED_TABLE_NAME IS NOT NULL',
            [$table]
        ))->map(fn ($fk) => [
            'column' => $fk->COLUMN_NAME,
            'referenced_table' => $fk->REFERENCED_TABLE_NAME,
            'referenced_column' => $fk->REFERENCED_COLUMN_NAME,
            'on_delete' => $fk->DELETE_RULE,
        ])->values()->all();
    }
}

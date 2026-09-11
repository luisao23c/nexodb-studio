<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Builder\AddForeignKeyRequest;
use App\Services\DynamicTableService;
use App\Support\SafeIdentifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class SchemaExplorerController extends Controller
{
    public function __construct(private DynamicTableService $tables) {}

    public function index(): JsonResponse
    {
        $tables = collect(DB::select('SHOW TABLES'))
            ->map(fn ($row) => (string) array_values((array) $row)[0])
            ->filter(fn ($name) => str_starts_with($name, 'nx_'))
            ->sort()
            ->map(fn ($name) => ['name' => $name, 'managed' => true, 'app_label' => Str::headline(Str::after($name, 'nx_'))])
            ->values();

        return response()->json(['tables' => $tables]);
    }

    public function show(string $table): JsonResponse
    {
        $this->assertTable($table);
        $columns = collect(DB::select("SHOW FULL COLUMNS FROM `{$table}`"))->map(fn ($column) => [
            'name' => $column->Field, 'type' => $column->Type, 'collation' => $column->Collation,
            'nullable' => $column->Null === 'YES', 'key' => $column->Key ?: null, 'default' => $column->Default,
            'extra' => $column->Extra ?: null, 'comment' => $column->Comment ?: null,
        ])->values();
        $indexes = collect(DB::select("SHOW INDEX FROM `{$table}`"))->groupBy('Key_name')->map(fn ($rows, $key) => [
            'name' => $key, 'unique' => ! (bool) $rows->first()->Non_unique,
            'columns' => $rows->sortBy('Seq_in_index')->pluck('Column_name')->all(),
        ])->values();

        $foreignKeys = collect(DB::select(
            'SELECT kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME, rc.DELETE_RULE
             FROM information_schema.KEY_COLUMN_USAGE kcu
             JOIN information_schema.REFERENTIAL_CONSTRAINTS rc USING (CONSTRAINT_NAME, CONSTRAINT_SCHEMA)
             WHERE kcu.CONSTRAINT_SCHEMA = DATABASE() AND kcu.TABLE_NAME = ?', [$table]
        ))->map(fn ($fk) => [
            'column_name' => $fk->COLUMN_NAME,
            'referenced_table_name' => $fk->REFERENCED_TABLE_NAME,
            'referenced_column_name' => $fk->REFERENCED_COLUMN_NAME,
            'on_delete' => $fk->DELETE_RULE,
        ])->values();

        return response()->json(['table' => $table, 'managed_by' => null, 'rows' => DB::table($table)->count(), 'columns' => $columns, 'indexes' => $indexes, 'foreign_keys' => $foreignKeys]);
    }

    public function relations(): JsonResponse
    {
        $foreignKeys = collect(DB::select(
            'SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_NAME LIKE ?', ['nx\_%']
        ));
        $tables = collect(DB::select('SHOW TABLES'))->map(fn ($row) => (string) array_values((array) $row)[0])->filter(fn ($name) => str_starts_with($name, 'nx_'));
        $relations = $tables->map(fn ($table) => [
            'table' => $table, 'name' => Str::headline(Str::after($table, 'nx_')),
            'relations' => $foreignKeys->where('TABLE_NAME', $table)->map(fn ($fk) => [
                'column' => $fk->COLUMN_NAME, 'target_table' => $fk->REFERENCED_TABLE_NAME,
                'target_module' => Str::headline(Str::after($fk->REFERENCED_TABLE_NAME, 'nx_')),
            ])->values(),
        ])->values();

        return response()->json(['modules' => $relations]);
    }

    public function addForeignKey(AddForeignKeyRequest $request, string $table): JsonResponse
    {
        $this->assertTable($table);
        $data = $request->validated();
        abort_unless(Schema::hasColumn($table, $data['column']), 422, 'La columna no existe.');
        abort_unless(Schema::hasTable($data['referenced_table']), 422, 'La tabla referenciada no existe.');
        $this->tables->addForeignKey($table, $data['column'], $data['referenced_table'], $data['referenced_column'] ?? 'id', $data['on_delete'] ?? 'SET NULL');

        return response()->json(['ok' => true, 'message' => 'Llave foránea creada correctamente.']);
    }

    public function dropForeignKey(string $table, string $column): JsonResponse
    {
        $this->assertTable($table);
        $this->tables->dropForeignKey($table, $column);

        return response()->json(['ok' => true, 'message' => 'Llave foránea eliminada.']);
    }

    public function foreignKeys(string $table): JsonResponse
    {
        $this->assertTable($table);
        $foreignKeys = collect(DB::select(
            'SELECT kcu.CONSTRAINT_NAME as constraint_name, kcu.COLUMN_NAME as column_name, kcu.REFERENCED_TABLE_NAME as referenced_table_name, kcu.REFERENCED_COLUMN_NAME as referenced_column_name, rc.DELETE_RULE as delete_rule
             FROM information_schema.KEY_COLUMN_USAGE kcu JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
             ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
             WHERE kcu.TABLE_SCHEMA = DATABASE() AND kcu.TABLE_NAME = ? AND kcu.REFERENCED_TABLE_NAME IS NOT NULL', [$table]
        ));

        return response()->json(['foreign_keys' => $foreignKeys]);
    }

    public function relationOptions(Request $request, string $table, string $column): JsonResponse
    {
        $this->assertTable($table);
        $foreignKey = DB::selectOne(
            'SELECT REFERENCED_TABLE_NAME as target_table, REFERENCED_COLUMN_NAME as target_column
             FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL',
            [$table, $column]
        );
        abort_unless($foreignKey, 404, 'La columna no tiene una relación configurada.');
        $this->assertTable($foreignKey->target_table);
        $definitions = collect(DB::select("SHOW COLUMNS FROM `{$foreignKey->target_table}`"));
        $display = $definitions->first(fn ($item) => preg_match('/varchar|text/i', $item->Type) && ! preg_match('/password|token|secret/i', $item->Field))?->Field ?? $foreignKey->target_column;
        $query = DB::table($foreignKey->target_table)->select($foreignKey->target_column.' as id', $display.' as label');
        if ($search = trim((string) $request->query('search', ''))) {
            $query->where($display, 'like', "%{$search}%");
        }

        return response()->json($query->orderBy($display)->limit(100)->get());
    }

    private function assertTable(string $table): void
    {
        abort_unless(SafeIdentifier::tableExists($table), 404, 'Tabla no encontrada.');
    }
}

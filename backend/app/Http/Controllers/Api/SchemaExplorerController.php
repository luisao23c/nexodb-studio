<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderModule;
use App\Services\DynamicTableService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SchemaExplorerController extends Controller
{
    public function __construct(private DynamicTableService $tables) {}

    public function index(): JsonResponse
    {
        $nxTables = BuilderModule::pluck('table_name', 'name')
            ->mapWithKeys(fn ($table, $name) => [$table => ['name' => $name, 'managed' => true]]);

        $managed = $nxTables->all();

        $tables = collect(DB::select('SHOW TABLES'))
            ->map(fn ($t) => (string) array_values((array) $t)[0])
            ->filter(fn ($name) => ! in_array($name, ['builder_modules', 'builder_fields', 'builder_menus', 'builder_menu_items', 'builder_roles', 'builder_permissions', 'builder_charts', 'builder_pages', 'builder_audit_logs', 'migrations', 'personal_access_tokens', 'failed_jobs', 'password_reset_tokens', 'users', 'cache', 'cache_locks', 'jobs', 'job_batches'], true))
            ->map(fn ($name) => [
                'name' => $name,
                'managed' => isset($managed[$name]),
                'app_label' => $managed[$name]['name'] ?? null,
            ])
            ->values();

        return response()->json(['tables' => $tables]);
    }

    public function show(string $table): JsonResponse
    {
        $module = BuilderModule::where('table_name', $table)->first();
        abort_if(! $module && ! str_starts_with($table, 'nx_'), 404);

        $columns = collect(DB::select("SHOW FULL COLUMNS FROM `{$table}`"))
            ->map(fn ($c) => [
                'name' => $c->Field,
                'type' => $c->Type,
                'collation' => $c->Collation,
                'nullable' => $c->Null === 'YES',
                'key' => $c->Key ?: null,
                'default' => $c->Default,
                'extra' => $c->Extra ?: null,
                'comment' => $c->Comment ?: null,
            ])->values();

        $indexes = collect(DB::select("SHOW INDEX FROM `{$table}`"))
            ->groupBy('Key_name')
            ->map(fn ($rows, $key) => [
                'name' => $key,
                'unique' => ! ((bool) $rows->first()->Non_unique),
                'columns' => $rows->sortBy('Seq_in_index')->pluck('Column_name')->all(),
            ])->values();

        $count = DB::table($table)->count();

        return response()->json([
            'table' => $table,
            'managed_by' => $module?->name,
            'rows' => $count,
            'columns' => $columns,
            'indexes' => $indexes,
        ]);
    }

    public function relations(): JsonResponse
    {
        $relations = BuilderModule::with(['fields' => fn ($q) => $q->where('data_type', 'relation')->with('relatedModule:id,name,table_name')])
            ->get(['id', 'name', 'table_name'])
            ->map(fn (BuilderModule $m) => [
                'table' => $m->table_name,
                'name' => $m->name,
                'relations' => $m->fields->map(fn ($f) => [
                    'column' => $f->name,
                    'target_table' => $f->relatedModule?->table_name,
                    'target_module' => $f->relatedModule?->name,
                ])->filter(fn ($r) => $r['target_table'])->values(),
            ])->values();

        return response()->json(['modules' => $relations]);
    }

    /** Add a foreign key constraint to a column. */
    public function addForeignKey(Request $request, string $table): JsonResponse
    {
        $data = $request->validate([
            'column' => 'required|string',
            'referenced_table' => 'required|string',
            'referenced_column' => 'nullable|string|default:id',
            'on_delete' => 'nullable|string|in:CASCADE,RESTRICT,SET NULL,NO ACTION',
        ]);

        if (!Schema::hasTable($table)) abort(404, 'Tabla no encontrada');
        if (!Schema::hasColumn($table, $data['column'])) abort(422, 'La columna no existe');
        if (!Schema::hasTable($data['referenced_table'])) abort(422, 'La tabla referenciada no existe');

        $this->tables->addForeignKey(
            $table,
            $data['column'],
            $data['referenced_table'],
            $data['referenced_column'] ?? 'id',
            $data['on_delete'] ?? 'SET NULL'
        );

        return response()->json(['ok' => true, 'message' => 'Foreign key creada correctamente']);
    }

    /** Drop a foreign key constraint from a column. */
    public function dropForeignKey(string $table, string $column): JsonResponse
    {
        if (!Schema::hasTable($table)) abort(404);
        $this->tables->dropForeignKey($table, $column);
        return response()->json(['ok' => true, 'message' => 'Foreign key eliminada']);
    }

    /** List foreign keys for a table. */
    public function foreignKeys(string $table): JsonResponse
    {
        if (!Schema::hasTable($table)) abort(404);
        $fks = collect(DB::select(
            "SELECT kcu.CONSTRAINT_NAME, kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME, rc.DELETE_RULE
             FROM information_schema.KEY_COLUMN_USAGE kcu
             JOIN information_schema.REFERENTIAL_CONSTRAINTS rc ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
             WHERE kcu.TABLE_SCHEMA = DATABASE() AND kcu.TABLE_NAME = ? AND kcu.REFERENCED_TABLE_NAME IS NOT NULL",
            [$table]
        ));
        return response()->json(['foreign_keys' => $fks]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderAuditLog;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DatabaseController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function browse(Request $request, string $table): JsonResponse
    {
        $this->assertSafeTable($table);
        $perPage = min((int) $request->query('per_page', 25), 100);
        $page = max((int) $request->query('page', 1), 1);
        $search = trim((string) $request->query('search', ''));

        $columns = collect(DB::select("SHOW COLUMNS FROM `{$table}`"))->pluck('Field')->all();
        $query = DB::table($table);
        if ($search !== '') {
            $query->where(function ($q) use ($columns, $search) {
                foreach ($columns as $i => $col) {
                    $i === 0 ? $q->where($col, 'like', "%{$search}%") : $q->orWhere($col, 'like', "%{$search}%");
                }
            });
        }
        $total = $query->count();
        $rows = $query->orderBy('id')->forPage($page, $perPage)->get();

        return response()->json([
            'data' => $rows, 'total' => $total,
            'current_page' => $page, 'last_page' => (int) ceil($total / $perPage), 'per_page' => $perPage,
        ]);
    }

    public function deleteRow(string $table, int $id): JsonResponse
    {
        $this->assertSafeTable($table);
        DB::table($table)->where('id', $id)->delete();
        $this->audit->log('row.delete', 'row', "{$table}#{$id}");

        return response()->json(null, 204);
    }

    public function storeRow(Request $request, string $table): JsonResponse
    {
        $this->assertSafeTable($table);
        $payload = $this->editableRowPayload($request, $table);
        if (in_array('created_at', $this->tableColumns($table), true)) $payload['created_at'] = now();
        if (in_array('updated_at', $this->tableColumns($table), true)) $payload['updated_at'] = now();
        $id = DB::table($table)->insertGetId($payload);
        $this->audit->log('row.create', 'row', "{$table}#{$id}", null, ['columns' => array_keys($payload)]);

        return response()->json((array) DB::table($table)->where('id', $id)->first(), 201);
    }

    public function updateRow(Request $request, string $table, int $id): JsonResponse
    {
        $this->assertSafeTable($table);
        abort_unless(DB::table($table)->where('id', $id)->exists(), 404, 'Registro no encontrado.');
        $payload = $this->editableRowPayload($request, $table);
        if (in_array('updated_at', $this->tableColumns($table), true)) $payload['updated_at'] = now();
        DB::table($table)->where('id', $id)->update($payload);
        $this->audit->log('row.update', 'row', "{$table}#{$id}", null, ['columns' => array_keys($payload)]);

        return response()->json((array) DB::table($table)->where('id', $id)->first());
    }

    /** Run a single read-only SQL statement (SELECT / SHOW / DESCRIBE / EXPLAIN). */
    public function query(Request $request): JsonResponse
    {
        $data = $request->validate(['sql' => 'required|string|max:10000']);
        $sql = trim(preg_replace('/\s+/', ' ', $data['sql']));
        $first = strtoupper(strtok(ltrim($sql), " \t(") ?: '');
        if (! in_array($first, ['SELECT','SHOW','DESCRIBE','DESC','EXPLAIN'], true)) {
            throw ValidationException::withMessages(['sql' => 'Sólo se permiten consultas de lectura (SELECT, SHOW, DESCRIBE, EXPLAIN).']);
        }
        if (preg_match('/;\s*\S/', $sql)) {
            throw ValidationException::withMessages(['sql' => 'Sólo una consulta por ejecución.']);
        }
        $start = microtime(true);
        $rows = collect(DB::select($sql))->take(500)->map(fn ($r) => (array) $r)->values();
        $elapsed = round((microtime(true) - $start) * 1000, 1);

        return response()->json([
            'columns' => $rows->isEmpty() ? [] : array_keys($rows->first()),
            'rows' => $rows, 'count' => $rows->count(), 'elapsed_ms' => $elapsed,
        ]);
    }

    public function addIndex(Request $request, string $table): JsonResponse
    {
        $this->assertSafeTable($table);
        $data = $request->validate([
            'columns' => 'required|array|min:1', 'columns.*' => ['string', 'max:64', 'regex:/^[a-zA-Z0-9_]+$/'],
            'unique' => 'boolean', 'name' => ['nullable', 'string', 'max:64', 'regex:/^[a-zA-Z0-9_]+$/'],
        ]);
        foreach ($data['columns'] as $column) abort_unless(\Illuminate\Support\Facades\Schema::hasColumn($table, $column), 422, "La columna {$column} no existe.");
        $name = ($data['name'] ?? '') ?: (($data['unique'] ?? false) ? 'uniq_' : 'idx_').implode('_', $data['columns']);
        $type = ($data['unique'] ?? false) ? 'UNIQUE' : 'INDEX';
        $cols = implode(', ', array_map(fn ($c) => '`'.str_replace('`', '', $c).'`', $data['columns']));
        DB::statement("ALTER TABLE `{$table}` ADD {$type} `{$name}` ({$cols})");
        $this->audit->log('index.create', 'index', "{$table}.{$name}", "ALTER TABLE `{$table}` ADD {$type} `{$name}` ({$cols})");

        return response()->json(['ok' => true, 'name' => $name], 201);
    }

    public function dropIndex(string $table, string $index): JsonResponse
    {
        $this->assertSafeTable($table);
        abort_unless(preg_match('/^[a-zA-Z0-9_]+$/', $index), 422, 'Nombre de índice inválido.');
        abort_if(strtolower($index) === 'primary', 422, 'La llave primaria no se puede eliminar.');
        DB::statement("ALTER TABLE `{$table}` DROP INDEX `{$index}`");
        $this->audit->log('index.drop', 'index', "{$table}.{$index}", "ALTER TABLE `{$table}` DROP INDEX `{$index}`");

        return response()->json(null, 204);
    }

    public function renameTable(Request $request, string $table): JsonResponse
    {
        $this->assertSafeTable($table);
        $data = $request->validate(['name' => 'required|string|max:60']);
        $new = app(\App\Services\DynamicTableService::class)->safeTableName($data['name']);
        abort_if(! preg_match('/^[a-z][a-z0-9_]{1,54}$/', $new), 422, 'Nombre de tabla inválido.');
        if ($new !== $table) {
            DB::statement("RENAME TABLE `{$table}` TO `{$new}`");
            DB::table('builder_permissions')->where('table_name', $table)->update(['table_name' => $new]);
            DB::table('builder_charts')->where('table_name', $table)->update(['table_name' => $new]);
            DB::table('builder_menu_items')->where('target_table', $table)->update(['target_table' => $new]);
            $this->audit->log('table.rename', 'table', "{$table} → {$new}", "RENAME TABLE `{$table}` TO `{$new}`");
        }

        return response()->json(['ok' => true, 'table' => $new]);
    }

    public function dropTable(string $table): JsonResponse
    {
        $this->assertSafeTable($table);
        DB::table('builder_permissions')->where('table_name', $table)->delete();
        DB::table('builder_charts')->where('table_name', $table)->delete();
        DB::table('builder_menu_items')->where('target_table', $table)->update(['target_table' => null, 'active' => false]);
        DB::statement("DROP TABLE IF EXISTS `{$table}`");
        $this->audit->log('table.drop', 'table', $table, "DROP TABLE IF EXISTS `{$table}`");

        return response()->json(null, 204);
    }

    /** Add a column directly to any nx_ table (raw DDL path for unmanaged tables). */
    public function addColumn(Request $request, string $table, \App\Services\DynamicTableService $tables): JsonResponse
    {
        $this->assertSafeTable($table);
        $data = $request->validate([
            'name' => 'required|string|max:60',
            'data_type' => ['required', \Illuminate\Validation\Rule::in(\App\Services\DynamicTableService::DATA_TYPES)],
            'length' => 'nullable|integer|min:1|max:1000', 'nullable' => 'boolean',
            'default_value' => 'nullable|string|max:255', 'unique' => 'boolean',
        ]);
        $name = $tables->safeColumnName($data['name']);
        abort_if(\Illuminate\Support\Facades\Schema::hasColumn($table, $name), 422, 'La columna ya existe.');
        $tables->addColumnRaw($table, $name, $data);

        return response()->json(['ok' => true, 'column' => $name], 201);
    }

    public function modifyColumn(Request $request, string $table, string $column, \App\Services\DynamicTableService $tables): JsonResponse
    {
        $this->assertSafeTable($table);
        $data = $request->validate([
            'data_type' => ['required', \Illuminate\Validation\Rule::in(\App\Services\DynamicTableService::DATA_TYPES)],
            'length' => 'nullable|integer|min:1|max:1000', 'nullable' => 'boolean',
            'default_value' => 'nullable|string|max:255', 'unique' => 'boolean',
        ]);
        abort_unless(\Illuminate\Support\Facades\Schema::hasColumn($table, $column), 404, 'La columna no existe.');
        $tables->modifyColumn($table, $column, $data);
        $this->audit->log('column.modify', 'column', "{$table}.{$column}");

        return response()->json(['ok' => true]);
    }

    public function dropColumn(string $table, string $column, \App\Services\DynamicTableService $tables): JsonResponse
    {
        $this->assertSafeTable($table);
        abort_unless(\Illuminate\Support\Facades\Schema::hasColumn($table, $column), 404, 'La columna no existe.');
        $tables->dropColumn($table, $column);
        $this->audit->log('column.drop', 'column', "{$table}.{$column}");

        return response()->json(null, 204);
    }

    /** Create a brand-new nx_ table with initial columns. */
    public function createTable(Request $request, \App\Services\DynamicTableService $tables): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:60',
            'columns' => 'nullable|array|max:30',
            'columns.*.name' => 'required|string|max:60',
            'columns.*.data_type' => ['required', \Illuminate\Validation\Rule::in(\App\Services\DynamicTableService::DATA_TYPES)],
            'columns.*.length' => 'nullable|integer|min:1|max:1000',
            'columns.*.nullable' => 'boolean',
            'columns.*.default_value' => 'nullable|string|max:255',
        ]);
        $name = $tables->safeTableName($data['name']);
        abort_if(\Illuminate\Support\Facades\Schema::hasTable($name), 422, 'La tabla ya existe.');
        \Illuminate\Support\Facades\Schema::create($name, function (\Illuminate\Database\Schema\Blueprint $t) {
            $t->id(); $t->timestamps();
        });
        foreach ($data['columns'] ?? [] as $col) {
            $colName = $tables->safeColumnName($col['name']);
            $tables->addColumnRaw($name, $colName, $col);
        }
        $this->audit->log('table.create', 'table', $name);

        return response()->json(['ok' => true, 'table' => $name], 201);
    }

    /** Delete all rows, keep structure. */
    public function truncate(string $table): JsonResponse
    {
        $this->assertSafeTable($table);
        DB::statement("TRUNCATE TABLE `{$table}`");
        $this->audit->log('table.truncate', 'table', $table, "TRUNCATE TABLE `{$table}`");

        return response()->json(null, 204);
    }

    /** Export a table as CSV, JSON or SQL inserts. */
    public function export(Request $request, string $table)
    {
        $this->assertSafeTable($table);
        $format = $request->query('format', 'csv');
        $rows = DB::table($table)->orderBy('id')->get()->map(fn ($r) => (array) $r)->all();
        $columns = $rows === [] ? collect(DB::select("SHOW COLUMNS FROM `{$table}`"))->pluck('Field')->all() : array_keys($rows[0]);
        $stamp = now()->format('Ymd_His');

        if ($format === 'json') {
            $this->audit->log('export', 'table', $table, null, ['format' => 'json', 'rows' => count($rows)]);

            return response()->streamDownload(function () use ($rows) {
                echo json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }, "{$table}_{$stamp}.json", ['Content-Type' => 'application/json']);
        }

        if ($format === 'sql') {
            $this->audit->log('export', 'table', $table, null, ['format' => 'sql', 'rows' => count($rows)]);
            $dump = "-- NexoDB Studio export\n-- Table: {$table}\n-- Date: {$stamp}\n\n";
            foreach ($rows as $row) {
                $values = implode(', ', array_map(fn ($v) => $v === null ? 'NULL' : DB::getPdo()->quote((string) $v), $row));
                $cols = implode(', ', array_map(fn ($c) => "`{$c}`", $columns));
                $dump .= "INSERT INTO `{$table}` ({$cols}) VALUES ({$values});\n";
            }

            return response()->streamDownload(function () use ($dump) { echo $dump; }, "{$table}_{$stamp}.sql", ['Content-Type' => 'application/sql']);
        }

        $this->audit->log('export', 'table', $table, null, ['format' => 'csv', 'rows' => count($rows)]);

        return response()->streamDownload(function () use ($rows, $columns) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel
            fputcsv($out, $columns);
            foreach ($rows as $row) fputcsv($out, array_map(fn ($v) => $v === null ? '' : (string) $v, $row));
            fclose($out);
        }, "{$table}_{$stamp}.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Bulk import rows from CSV. Validates ids collision and reports per-row errors. */
    public function import(Request $request, string $table)
    {
        $this->assertSafeTable($table);
        $request->validate(['file' => 'required|file|max:5120|mimetypes:text/csv,text/plain,application/csv']);
        $handle = fopen($request->file('file')->getRealPath(), 'r');
        if ($handle === false) throw ValidationException::withMessages(['file' => 'No se pudo leer el archivo.']);

        $header = fgetcsv($handle);
        if (! $header) throw ValidationException::withMessages(['file' => 'El CSV está vacío.']);
        $header = array_map(fn ($h) => trim(str_replace("\xEF\xBB\xBF", '', (string) $h)), $header);

        $tableColumns = collect(DB::select("SHOW COLUMNS FROM `{$table}`"))->pluck('Field')->all();
        $invalid = array_diff($header, $tableColumns);
        if ($invalid !== []) throw ValidationException::withMessages(['file' => 'Columnas desconocidas: '.implode(', ', $invalid).'. Columnas válidas: '.implode(', ', $tableColumns)]);

        $inserted = 0; $errors = []; $line = 1;
        while (($raw = fgetcsv($handle)) !== false) {
            $line++;
            if (count($header) !== count($raw)) { $errors[] = "Línea {$line}: número de columnas incorrecto"; continue; }
            $row = array_combine($header, array_map(fn ($v) => ($v === '' ? null : $v), $raw));
            if (isset($row['id']) && DB::table($table)->where('id', $row['id'])->exists()) { $errors[] = "Línea {$line}: id {$row['id']} ya existe"; continue; }
            try {
                if (isset($row['id'])) unset($row['id']);
                if (in_array('created_at', $tableColumns, true) && ! array_key_exists('created_at', $row)) $row['created_at'] = now();
                if (in_array('updated_at', $tableColumns, true) && ! array_key_exists('updated_at', $row)) $row['updated_at'] = now();
                DB::table($table)->insert($row);
                $inserted++;
            } catch (\Throwable $e) { $errors[] = "Línea {$line}: ".$e->getMessage(); }
        }
        fclose($handle);
        $this->audit->log('import', 'table', $table, null, ['inserted' => $inserted, 'errors' => count($errors)]);

        return response()->json(['inserted' => $inserted, 'errors' => $errors, 'total_lines' => $line - 1]);
    }

    /** Audit log listing with optional filters. */
    public function auditIndex(Request $request): JsonResponse
    {
        $q = BuilderAuditLog::query()->orderByDesc('created_at')->limit(200);
        if ($action = $request->query('action')) $q->where('action', $action);
        if ($target = $request->query('target')) $q->where('target', 'like', "%{$target}%");

        return response()->json($q->get());
    }

    /** Dashboard: database-level stats + recent activity. */
    public function dashboard(): JsonResponse
    {
        $database = config('database.connections.mysql.database');
        $tables = collect(DB::select(
            'SELECT TABLE_NAME as name, ENGINE as engine, TABLE_ROWS as `rows`, ROUND((DATA_LENGTH + INDEX_LENGTH)/1024, 1) as size_kb
             FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC',
            [$database]
        ))->filter(fn ($t) => str_starts_with($t->name, 'nx_'))->values();

        $totalRows = (int) $tables->sum(fn ($t) => (int) ($t->rows ?? 0));
        $totalSize = round((float) $tables->sum(fn ($t) => (float) $t->size_kb), 1);
        $recent = BuilderAuditLog::orderByDesc('created_at')->limit(8)->get(['action', 'target', 'created_at']);
        $last7 = BuilderAuditLog::selectRaw("DATE(created_at) as d, COUNT(*) as c")
            ->where('created_at', '>=', now()->subDays(7))->groupBy('d')->orderBy('d')->get();

        return response()->json([
            'database' => $database, 'tables' => $tables, 'total_tables' => $tables->count(),
            'total_rows' => $totalRows, 'total_size_kb' => $totalSize, 'recent' => $recent, 'activity' => $last7,
        ]);
    }

    /** Stats overview for the whole database: engine, rows, size per table. */
    public function overview(): JsonResponse
    {
        $database = config('database.connections.mysql.database');
        $rows = collect(DB::select(
            'SELECT TABLE_NAME as name, ENGINE as engine, TABLE_ROWS as `rows`, ROUND((DATA_LENGTH + INDEX_LENGTH)/1024, 1) as size_kb, TABLE_COLLATION as collation
             FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
            [$database]
        ))->filter(fn ($t) => str_starts_with($t->name, 'nx_'))->values();

        return response()->json(['database' => $database, 'tables' => $rows]);
    }

    private function assertSafeTable(string $table): void
    {
        if (! preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
            throw ValidationException::withMessages(['table' => 'Nombre de tabla inválido.']);
        }
        if (! str_starts_with($table, 'nx_')) {
            throw ValidationException::withMessages(['table' => 'Sólo se permiten tablas con prefijo nx_.']);
        }
        abort_unless(\Illuminate\Support\Facades\Schema::hasTable($table), 404, 'Tabla no encontrada.');
    }

    private function tableColumns(string $table): array
    {
        return collect(DB::select("SHOW COLUMNS FROM `{$table}`"))->pluck('Field')->all();
    }

    private function editableRowPayload(Request $request, string $table): array
    {
        $definitions = collect(DB::select("SHOW FULL COLUMNS FROM `{$table}`"));
        $editable = $definitions->reject(fn ($column) => in_array($column->Field, ['id', 'created_at', 'updated_at', 'deleted_at'], true) || str_contains(strtolower((string) $column->Extra), 'auto_increment'));
        $unknown = array_diff(array_keys($request->all()), $editable->pluck('Field')->all());
        if ($unknown !== []) throw ValidationException::withMessages(['data' => 'Columnas no permitidas: '.implode(', ', $unknown)]);

        $payload = [];
        foreach ($editable as $column) {
            if (! $request->exists($column->Field)) continue;
            $value = $request->input($column->Field);
            if ($value === '' && ($column->Null === 'YES' || $column->Default !== null)) $value = null;
            if (preg_match('/^tinyint\(1\)/i', $column->Type)) $value = filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? 0;
            $payload[$column->Field] = $value;
        }
        if ($payload === []) throw ValidationException::withMessages(['data' => 'No hay valores para guardar.']);

        return $payload;
    }
}

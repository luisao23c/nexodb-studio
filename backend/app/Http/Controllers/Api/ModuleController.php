<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BuilderModule;
use App\Services\AuditService;
use App\Services\DynamicTableService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ModuleController extends Controller
{
    public function __construct(private DynamicTableService $tables, private AuditService $audit) {}

    public function index(): JsonResponse
    {
        return response()->json(BuilderModule::with(['fields.relatedModule:id,name,table_name'])->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['name'=>'required|string|max:60|unique:builder_modules,name','description'=>'nullable|string|max:500','icon'=>'nullable|string|max:30']);
        $tableName = $this->tables->safeTableName($data['name']);
        $slug = Str::slug($data['name']);
        if (Schema::hasTable($tableName)) return response()->json(['message'=>'La tabla física ya existe.'], 422);

        // DDL implícitamente confirma en MySQL: primero la tabla física, luego el metadato.
        BuilderModule::create([...$data, 'slug'=>$slug, 'table_name'=>$tableName]);
        $module = BuilderModule::where('table_name', $tableName)->firstOrFail();
        $this->tables->createTable($module);
        $this->audit->log('module.create', 'table', $tableName);
        return response()->json($module->load('fields'), 201);
    }

    public function show(BuilderModule $module): JsonResponse
    {
        return response()->json($module->load(['fields.relatedModule:id,name,table_name']));
    }

    public function update(Request $request, BuilderModule $module): JsonResponse
    {
        $data = $request->validate(['name'=>'sometimes|required|string|max:60','description'=>'nullable|string|max:500','icon'=>'nullable|string|max:30','active'=>'boolean']);
        $module->update($data);
        return response()->json($module->fresh()->load('fields'));
    }
}

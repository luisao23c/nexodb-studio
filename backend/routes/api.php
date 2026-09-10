<?php

use App\Http\Controllers\Api\ChartController;
use App\Http\Controllers\Api\DatabaseController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SchemaExplorerController;
use App\Http\Controllers\Api\InterfaceBuilderController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true, 'name' => 'NexoDB Studio']);

// Public render of a custom page (used by the preview).
Route::get('/pages/{page}/render', [PageController::class, 'show'])->whereNumber('page');

Route::middleware(['builder.admin', 'throttle:api'])->prefix('builder')->group(function () {
    // Database explorer
    Route::get('/schema/tables', [SchemaExplorerController::class, 'index']);
    Route::get('/schema/tables/{table}', [SchemaExplorerController::class, 'show'])->where('table', '[a-zA-Z0-9_]+');
    Route::get('/schema/relations', [SchemaExplorerController::class, 'relations']);
    Route::get('/db/overview', [DatabaseController::class, 'overview']);
    Route::get('/db/dashboard', [DatabaseController::class, 'dashboard']);
    Route::get('/db/audit', [DatabaseController::class, 'auditIndex']);
    Route::post('/db/{table}/import', [DatabaseController::class, 'import'])->where('table', '[a-zA-Z0-9_]+');
    Route::get('/db/{table}/export', [DatabaseController::class, 'export'])->where('table', '[a-zA-Z0-9_]+');
    Route::post('/db/tables', [DatabaseController::class, 'createTable']);
    Route::post('/db/{table}/truncate', [DatabaseController::class, 'truncate'])->where('table', '[a-zA-Z0-9_]+');
    Route::get('/db/{table}/browse', [DatabaseController::class, 'browse'])->where('table', '[a-zA-Z0-9_]+');
    Route::post('/db/{table}/rows', [DatabaseController::class, 'storeRow'])->where('table', '[a-zA-Z0-9_]+');
    Route::put('/db/{table}/rows/{id}', [DatabaseController::class, 'updateRow'])->where('table', '[a-zA-Z0-9_]+')->whereNumber('id');
    Route::delete('/db/{table}/rows/{id}', [DatabaseController::class, 'deleteRow'])->where('table', '[a-zA-Z0-9_]+')->whereNumber('id');
    Route::post('/db/query', [DatabaseController::class, 'query']);
    Route::post('/db/{table}/indexes', [DatabaseController::class, 'addIndex'])->where('table', '[a-zA-Z0-9_]+');
    Route::delete('/db/{table}/indexes/{index}', [DatabaseController::class, 'dropIndex'])->where('table', '[a-zA-Z0-9_]+');
    Route::put('/db/{table}/rename', [DatabaseController::class, 'renameTable'])->where('table', '[a-zA-Z0-9_]+');
    Route::delete('/db/{table}', [DatabaseController::class, 'dropTable'])->where('table', '[a-zA-Z0-9_]+');
    Route::post('/db/{table}/columns', [DatabaseController::class, 'addColumn'])->where('table', '[a-zA-Z0-9_]+');
    Route::put('/db/{table}/columns/{column}', [DatabaseController::class, 'modifyColumn'])->where('table', '[a-zA-Z0-9_]+')->where('column', '[a-zA-Z0-9_]+');
    Route::delete('/db/{table}/columns/{column}', [DatabaseController::class, 'dropColumn'])->where('table', '[a-zA-Z0-9_]+')->where('column', '[a-zA-Z0-9_]+');

    // Foreign keys
    Route::get('/db/{table}/foreign-keys', [SchemaExplorerController::class, 'foreignKeys'])->where('table', '[a-zA-Z0-9_]+');
    Route::get('/db/{table}/columns/{column}/options', [SchemaExplorerController::class, 'relationOptions'])->where('table', '[a-zA-Z0-9_]+')->where('column', '[a-zA-Z0-9_]+');
    Route::post('/db/{table}/foreign-keys', [SchemaExplorerController::class, 'addForeignKey'])->where('table', '[a-zA-Z0-9_]+');
    Route::delete('/db/{table}/foreign-keys/{column}', [SchemaExplorerController::class, 'dropForeignKey'])->where('table', '[a-zA-Z0-9_]+')->where('column', '[a-zA-Z0-9_]+');

    // Menus
    Route::get('/menus', [MenuController::class, 'index']);
    Route::post('/menus', [MenuController::class, 'store']);
    Route::put('/menus/{menu}', [MenuController::class, 'update']);
    Route::delete('/menus/{menu}', [MenuController::class, 'destroy']);
    Route::get('/menus-render', [MenuController::class, 'render']);
    Route::post('/menus/{menu}/items', [MenuController::class, 'storeItem']);
    Route::put('/menus/{menu}/items/{item}', [MenuController::class, 'updateItem']);
    Route::delete('/menus/{menu}/items/{item}', [MenuController::class, 'destroyItem']);
    Route::post('/menus/{menu}/reorder', [MenuController::class, 'reorderItems']);

    // Roles & permissions
    Route::get('/roles', [RoleController::class, 'index']);
    Route::post('/roles', [RoleController::class, 'store']);
    Route::put('/roles/{role}', [RoleController::class, 'update']);
    Route::delete('/roles/{role}', [RoleController::class, 'destroy']);
    Route::put('/roles/{role}/permissions', [RoleController::class, 'savePermissions']);

    // Charts
    Route::get('/charts', [ChartController::class, 'index']);
    Route::post('/charts', [ChartController::class, 'store']);
    Route::put('/charts/{chart}', [ChartController::class, 'update']);
    Route::delete('/charts/{chart}', [ChartController::class, 'destroy']);
    Route::get('/charts/{chart}/data', [ChartController::class, 'data']);

    // Custom code pages
    Route::get('/pages', [PageController::class, 'index']);
    Route::post('/pages', [PageController::class, 'store']);
    Route::get('/pages/{page}', [PageController::class, 'show']);
    Route::put('/pages/{page}', [PageController::class, 'update']);
    Route::delete('/pages/{page}', [PageController::class, 'destroy']);

    // Reusable form and table-view designers
    Route::get('/forms', [InterfaceBuilderController::class, 'forms']);
    Route::get('/forms/key/{key}', [InterfaceBuilderController::class, 'formByKey'])->where('key', '[a-z0-9_.-]+');
    Route::post('/forms', [InterfaceBuilderController::class, 'storeForm']);
    Route::put('/forms/{form}', [InterfaceBuilderController::class, 'updateForm']);
    Route::delete('/forms/{form}', [InterfaceBuilderController::class, 'destroyForm']);
    Route::get('/views', [InterfaceBuilderController::class, 'views']);
    Route::get('/views/key/{key}', [InterfaceBuilderController::class, 'viewByKey'])->where('key', '[a-z0-9_.-]+');
    Route::post('/views', [InterfaceBuilderController::class, 'storeView']);
    Route::put('/views/{view}', [InterfaceBuilderController::class, 'updateView']);
    Route::delete('/views/{view}', [InterfaceBuilderController::class, 'destroyView']);
});

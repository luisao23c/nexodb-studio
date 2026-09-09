<?php

use App\Http\Controllers\Api\FieldController;
use App\Http\Controllers\Api\ModuleController;
use App\Http\Controllers\Api\RecordController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok'=>true,'name'=>'NexoDB Studio']);

Route::middleware(['builder.admin','throttle:api'])->prefix('builder')->group(function () {
    Route::get('/modules', [ModuleController::class,'index']);
    Route::post('/modules', [ModuleController::class,'store']);
    Route::get('/modules/{module}', [ModuleController::class,'show']);
    Route::put('/modules/{module}', [ModuleController::class,'update']);
    Route::post('/modules/{module}/fields', [FieldController::class,'store']);
    Route::put('/modules/{module}/fields/{field}', [FieldController::class,'update']);
    Route::get('/modules/{module}/options', [RecordController::class,'options']);
    Route::get('/modules/{module}/records', [RecordController::class,'index']);
    Route::post('/modules/{module}/records', [RecordController::class,'store']);
    Route::get('/modules/{module}/records/{record}', [RecordController::class,'show']);
    Route::put('/modules/{module}/records/{record}', [RecordController::class,'update']);
    Route::delete('/modules/{module}/records/{record}', [RecordController::class,'destroy']);
});

<?php

use App\Http\Middleware\BuilderAdminMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['builder.admin' => BuilderAdminMiddleware::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {})
    ->create();

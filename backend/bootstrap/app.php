<?php

use App\Http\Middleware\BuilderAdminMiddleware;
use App\Http\Middleware\ResolveProjectMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'builder.admin' => BuilderAdminMiddleware::class,
            'project.scope' => ResolveProjectMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*') || $request->expectsJson());

        $exceptions->render(function (Throwable $e, $request) {
            if (config('app.debug') || ! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }
            if ($e instanceof ValidationException) {
                return null;
            }
            $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;
            report($e);

            return response()->json(['message' => 'Ha ocurrido un error.'], $status);
        });
    })
    ->create();

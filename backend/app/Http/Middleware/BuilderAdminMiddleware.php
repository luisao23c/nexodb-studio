<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BuilderAdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) env('BUILDER_ADMIN_KEY');
        if ($expected !== '' && ! hash_equals($expected, (string) $request->header('X-Builder-Key'))) {
            return response()->json(['message' => 'Clave de administración inválida.'], 401);
        }
        return $next($request);
    }
}

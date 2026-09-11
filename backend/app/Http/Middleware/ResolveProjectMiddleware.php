<?php

namespace App\Http\Middleware;

use App\Models\Project;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveProjectMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $projectId = $request->header('X-Project-Id');
        $project = $projectId ? Project::find($projectId) : null;

        if (! $project) {
            return response()->json(['message' => 'Proyecto inválido o no especificado.'], 422);
        }

        $request->attributes->set('project', $project);

        return $next($request);
    }
}

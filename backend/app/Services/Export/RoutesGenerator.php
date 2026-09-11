<?php

namespace App\Services\Export;

use Illuminate\Support\Str;

/** Generates routes/api.php wiring every generated controller as a real REST resource. */
class RoutesGenerator
{
    /** @param  string[]  $tableNames */
    public function generate(array $tableNames): string
    {
        $uses = [];
        $routes = [];
        foreach ($tableNames as $table) {
            $modelClass = NameResolver::modelClass($table);
            $segment = NameResolver::routeSegment($table);
            $param = Str::camel($modelClass);
            $uses[] = "use App\\Http\\Controllers\\Api\\{$modelClass}Controller;";
            $routes[] = "Route::apiResource('{$segment}', {$modelClass}Controller::class)->parameters(['{$segment}' => '{$param}']);";
        }

        $usesBlock = implode("\n", array_unique($uses));
        $routesBlock = implode("\n", $routes);

        return <<<PHP
<?php

{$usesBlock}
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true]);

{$routesBlock}

PHP;
    }
}

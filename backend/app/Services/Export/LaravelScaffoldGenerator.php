<?php

namespace App\Services\Export;

/** Generates the minimal set of framework files a fresh Laravel 12 API project needs to actually boot — no NexoDB-specific middleware/services, since the exported app doesn't need the dynamic builder engine. */
class LaravelScaffoldGenerator
{
    /** @return array<string, string> filename => contents */
    public function generate(string $projectName, string $projectSlug): array
    {
        $files = [];
        $files['composer.json'] = $this->composerJson($projectName);
        $files['artisan'] = $this->artisan();
        $files['public/index.php'] = $this->publicIndex();
        $files['bootstrap/app.php'] = $this->bootstrapApp();
        $files['bootstrap/providers.php'] = "<?php\n\nreturn [\n    App\\Providers\\AppServiceProvider::class,\n];\n";
        $files['app/Providers/AppServiceProvider.php'] = $this->appServiceProvider();
        $files['app/Http/Controllers/Controller.php'] = $this->baseController();
        $files['routes/console.php'] = "<?php\n";
        $files['.env.example'] = $this->envExample($projectName, $projectSlug);
        $files['.gitignore'] = "/vendor/\n/node_modules/\n.env\n/storage/*.key\n";
        $files['config/app.php'] = $this->configApp($projectName);
        $files['config/database.php'] = $this->configDatabase();
        $files['config/cache.php'] = "<?php\n\nreturn ['default' => env('CACHE_STORE', 'file'), 'stores' => ['file' => ['driver' => 'file', 'path' => storage_path('framework/cache/data')], 'array' => ['driver' => 'array', 'serialize' => false]], 'prefix' => env('CACHE_PREFIX', '{$projectSlug}-cache-')];\n";
        $files['config/session.php'] = "<?php\n\nreturn ['driver' => env('SESSION_DRIVER', 'file'), 'lifetime' => (int) env('SESSION_LIFETIME', 120), 'expire_on_close' => false, 'encrypt' => false, 'files' => storage_path('framework/sessions'), 'connection' => env('SESSION_CONNECTION'), 'table' => env('SESSION_TABLE', 'sessions'), 'store' => env('SESSION_STORE'), 'lottery' => [2, 100], 'cookie' => env('SESSION_COOKIE', '{$projectSlug}_session'), 'path' => '/', 'domain' => env('SESSION_DOMAIN'), 'secure' => env('SESSION_SECURE_COOKIE'), 'http_only' => true, 'same_site' => 'lax', 'partitioned' => false];\n";
        $files['config/filesystems.php'] = "<?php\n\nreturn ['default' => env('FILESYSTEM_DISK', 'local'), 'disks' => ['local' => ['driver' => 'local', 'root' => storage_path('app/private'), 'serve' => true, 'throw' => false], 'public' => ['driver' => 'local', 'root' => storage_path('app/public'), 'url' => env('APP_URL').'/storage', 'visibility' => 'public', 'throw' => false]], 'links' => [public_path('storage') => storage_path('app/public')]];\n";
        $files['config/logging.php'] = "<?php\n\nreturn ['default' => env('LOG_CHANNEL', 'stack'), 'channels' => ['stack' => ['driver' => 'stack', 'channels' => ['single'], 'ignore_exceptions' => false], 'single' => ['driver' => 'single', 'path' => storage_path('logs/laravel.log'), 'level' => env('LOG_LEVEL', 'debug'), 'replace_placeholders' => true]]];\n";
        $files['config/queue.php'] = "<?php\n\nreturn ['default' => env('QUEUE_CONNECTION', 'sync'), 'connections' => ['sync' => ['driver' => 'sync']], 'failed' => ['driver' => env('QUEUE_FAILED_DRIVER', 'database-uuids'), 'database' => env('DB_CONNECTION', 'mysql'), 'table' => 'failed_jobs']];\n";
        $files['storage/framework/.gitkeep'] = '';
        $files['storage/framework/cache/data/.gitkeep'] = '';
        $files['storage/framework/sessions/.gitkeep'] = '';
        $files['storage/framework/views/.gitkeep'] = '';
        $files['storage/logs/.gitkeep'] = '';
        $files['bootstrap/cache/.gitkeep'] = '';
        $files['README.md'] = $this->readme($projectName);

        return $files;
    }

    private function composerJson(string $projectName): string
    {
        $name = strtolower(str_replace(' ', '-', $projectName));

        return <<<JSON
{
    "name": "export/{$name}",
    "type": "project",
    "description": "Exported from NexoDB Studio.",
    "require": {
        "php": "^8.2",
        "laravel/framework": "^12.0"
    },
    "autoload": {
        "psr-4": { "App\\\\": "app/", "Database\\\\Factories\\\\": "database/factories/", "Database\\\\Seeders\\\\": "database/seeders/" }
    },
    "scripts": {
        "post-autoload-dump": ["Illuminate\\\\Foundation\\\\ComposerScripts::postAutoloadDump", "@php artisan package:discover --ansi"]
    },
    "minimum-stability": "stable",
    "prefer-stable": true
}

JSON;
    }

    private function artisan(): string
    {
        return <<<'PHP'
#!/usr/bin/env php
<?php

use Illuminate\Foundation\Application;
use Symfony\Component\Console\Input\ArgvInput;

define('LARAVEL_START', microtime(true));
require __DIR__.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once __DIR__.'/bootstrap/app.php';
$status = $app->handleCommand(new ArgvInput);
exit($status);

PHP;
    }

    private function publicIndex(): string
    {
        return <<<'PHP'
<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));
require __DIR__.'/../vendor/autoload.php';
(require_once __DIR__.'/../bootstrap/app.php')->handleRequest(Request::capture());

PHP;
    }

    private function bootstrapApp(): string
    {
        return <<<'PHP'
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();

PHP;
    }

    private function appServiceProvider(): string
    {
        return <<<'PHP'
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
    }

    public function boot(): void
    {
    }
}

PHP;
    }

    private function baseController(): string
    {
        return <<<'PHP'
<?php

namespace App\Http\Controllers;

abstract class Controller
{
}

PHP;
    }

    private function envExample(string $projectName, string $projectSlug): string
    {
        return <<<ENV
APP_NAME="{$projectName}"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE={$projectSlug}
DB_USERNAME=root
DB_PASSWORD=

LOG_CHANNEL=stack
LOG_LEVEL=debug
CACHE_STORE=file
QUEUE_CONNECTION=sync
SESSION_DRIVER=file

ENV;
    }

    private function configApp(string $projectName): string
    {
        return <<<PHP
<?php

return [
    'name' => env('APP_NAME', '{$projectName}'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'timezone' => 'UTC',
    'locale' => 'es',
    // No lang/es files are generated, so this falls back to Laravel's own bundled English
    // translations (e.g. validation messages) instead of showing raw "validation.required" keys.
    'fallback_locale' => 'en',
    'key' => env('APP_KEY'),
    'cipher' => 'AES-256-CBC',
];

PHP;
    }

    private function configDatabase(): string
    {
        return <<<'PHP'
<?php

return [
    'default' => env('DB_CONNECTION', 'mysql'),
    'connections' => [
        'mysql' => [
            'driver' => 'mysql', 'url' => env('DB_URL'), 'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'), 'database' => env('DB_DATABASE', 'laravel'),
            'username' => env('DB_USERNAME', 'root'), 'password' => env('DB_PASSWORD', ''),
            'unix_socket' => env('DB_SOCKET', ''), 'charset' => env('DB_CHARSET', 'utf8mb4'),
            'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'), 'prefix' => '',
            'prefix_indexes' => true, 'strict' => true, 'engine' => null,
        ],
    ],
    'migrations' => ['table' => 'migrations', 'update_date_on_publish' => true],
];

PHP;
    }

    private function readme(string $projectName): string
    {
        return <<<MD
# {$projectName}

Exportado desde NexoDB Studio como una aplicación Laravel + React independiente y editable.

## Backend

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

MD;
    }
}

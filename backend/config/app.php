<?php

return [
    'name' => env('APP_NAME', 'NexoDB Studio'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'timezone' => 'America/Monterrey',
    'locale' => 'es',
    'fallback_locale' => 'es',
    'key' => env('APP_KEY'),
    'cipher' => 'AES-256-CBC',
];

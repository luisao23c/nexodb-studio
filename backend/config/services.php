<?php

return [
    // Shared admin key protecting all /api/builder/* routes (see BuilderAdminMiddleware).
    'builder_admin_key' => env('BUILDER_ADMIN_KEY', ''),
];

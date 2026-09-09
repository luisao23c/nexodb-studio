<?php

namespace App\Services;

use App\Models\BuilderAuditLog;
use Illuminate\Http\Request;

class AuditService
{
    public function __construct(private Request $request) {}

    public function log(string $action, string $targetType = '', string $target = '', ?string $sql = null, array $meta = []): void
    {
        try {
            BuilderAuditLog::create([
                'actor' => 'admin-key',
                'action' => $action,
                'target_type' => $targetType ?: null,
                'target' => $target ?: null,
                'sql_statement' => $sql,
                'meta' => $meta ?: null,
                'ip' => $this->request->ip(),
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // Auditing must never break the main operation.
        }
    }
}

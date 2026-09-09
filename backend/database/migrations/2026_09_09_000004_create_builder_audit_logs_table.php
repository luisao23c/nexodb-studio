<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('builder_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('actor')->default('admin');
            $table->string('action', 40);
            $table->string('target_type', 30)->nullable();
            $table->string('target', 120)->nullable();
            $table->text('sql_statement')->nullable();
            $table->json('meta')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['created_at']);
            $table->index(['action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('builder_audit_logs');
    }
};

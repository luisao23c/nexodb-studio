<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->boolean('preview_writes_enabled')->default(false)->after('is_public');
        });

        Schema::create('project_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('version', 30);
            $table->unsignedInteger('major')->default(1);
            $table->unsignedInteger('minor')->default(0);
            $table->unsignedInteger('patch')->default(0);
            $table->string('label', 140)->nullable();
            $table->text('notes')->nullable();
            $table->longText('snapshot');
            $table->json('change_summary')->nullable();
            $table->string('snapshot_hash', 64);
            $table->boolean('is_published')->default(false);
            $table->timestamp('restored_at')->nullable();
            $table->timestamps();
            $table->unique(['project_id', 'version']);
            $table->index(['project_id', 'is_published']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_versions');
        Schema::table('projects', fn (Blueprint $table) => $table->dropColumn('preview_writes_enabled'));
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nx_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('nx_routes')->nullOnDelete();
            $table->string('name', 100);
            $table->string('slug', 100);
            $table->string('icon', 50)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->enum('content_type', ['table', 'form', 'chart', 'page', 'redirect', 'divider', 'empty'])->default('empty');
            $table->json('content_config')->nullable();
            $table->enum('layout', ['default', 'sidebar', 'tabs', 'fullwidth', 'card'])->default('default');
            $table->boolean('active')->default(true);
            $table->boolean('visible_in_menu')->default(true);
            $table->string('badge_color', 20)->nullable();
            $table->string('badge_label', 30)->nullable();
            $table->timestamps();

            $table->unique(['parent_id', 'slug']);
            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nx_routes');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('builder_fields', function (Blueprint $table) {
            $table->string('format')->default('none');
            $table->json('format_config')->nullable();
        });

        Schema::create('builder_menus', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('icon')->default('folder');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('builder_menu_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_id')->constrained('builder_menus')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('builder_menu_items')->nullOnDelete();
            $table->string('label');
            $table->string('icon')->default('circle');
            $table->string('target_type')->default('module');
            $table->unsignedBigInteger('target_id')->nullable();
            $table->string('url')->nullable();
            $table->string('badge')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->json('required_role_ids')->nullable();
            $table->timestamps();
        });

        Schema::create('builder_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->string('color')->default('#6d5dfc');
            $table->boolean('is_admin')->default(false);
            $table->timestamps();
        });

        Schema::create('builder_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('builder_roles')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('builder_modules')->cascadeOnDelete();
            $table->boolean('can_read')->default(true);
            $table->boolean('can_create')->default(false);
            $table->boolean('can_update')->default(false);
            $table->boolean('can_delete')->default(false);
            $table->timestamps();
            $table->unique(['role_id', 'module_id']);
        });

        Schema::create('builder_charts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('module_id')->constrained('builder_modules')->cascadeOnDelete();
            $table->string('chart_type')->default('bar');
            $table->string('label_field');
            $table->string('value_field')->nullable();
            $table->string('aggregate')->default('count');
            $table->string('sort_direction')->default('desc');
            $table->unsignedInteger('limit')->default(10);
            $table->string('color')->default('#6d5dfc');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('builder_pages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->longText('code');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('builder_fields', fn (Blueprint $t) => $t->dropColumn(['format', 'format_config']));
        foreach (['builder_menu_items', 'builder_menus', 'builder_permissions', 'builder_roles', 'builder_charts', 'builder_pages'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('builder_forms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('form_key', 100)->unique();
            $table->string('table_name');
            $table->string('description')->nullable();
            $table->unsignedTinyInteger('layout_columns')->default(2);
            $table->string('submit_label')->default('Guardar');
            $table->json('settings')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('builder_form_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained('builder_forms')->cascadeOnDelete();
            $table->string('field_key', 100);
            $table->string('label');
            $table->string('field_type', 40);
            $table->string('source_column')->nullable();
            $table->string('placeholder')->nullable();
            $table->string('help_text')->nullable();
            $table->text('default_value')->nullable();
            $table->unsignedTinyInteger('width')->default(12);
            $table->boolean('required')->default(false);
            $table->json('options')->nullable();
            $table->json('config')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['form_id', 'field_key']);
        });

        Schema::create('builder_views', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('view_key', 100)->unique();
            $table->string('table_name');
            $table->string('description')->nullable();
            $table->string('primary_key')->default('id');
            $table->string('default_sort_column')->nullable();
            $table->enum('default_sort_direction', ['asc', 'desc'])->default('desc');
            $table->unsignedSmallInteger('per_page')->default(20);
            $table->json('settings')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('builder_view_columns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('view_id')->constrained('builder_views')->cascadeOnDelete();
            $table->string('column_key');
            $table->string('label');
            $table->string('display_type', 40)->default('text');
            $table->unsignedSmallInteger('width')->nullable();
            $table->boolean('sortable')->default(true);
            $table->boolean('searchable')->default(false);
            $table->boolean('visible')->default(true);
            $table->json('config')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['view_id', 'column_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('builder_view_columns');
        Schema::dropIfExists('builder_views');
        Schema::dropIfExists('builder_form_fields');
        Schema::dropIfExists('builder_forms');
    }
};

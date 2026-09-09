<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('builder_fields', function (Blueprint $table) {
            $table->id(); $table->foreignId('module_id')->constrained('builder_modules')->cascadeOnDelete();
            $table->string('name'); $table->string('label'); $table->string('data_type'); $table->string('input_type'); $table->unsignedInteger('length')->nullable();
            $table->boolean('nullable')->default(true); $table->boolean('unique')->default(false); $table->string('default_value')->nullable(); $table->boolean('required')->default(false);
            $table->boolean('show_in_table')->default(true); $table->boolean('show_in_form')->default(true); $table->boolean('searchable')->default(false); $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('related_module_id')->nullable()->constrained('builder_modules')->nullOnDelete(); $table->string('display_column')->nullable();
            $table->json('options')->nullable(); $table->json('validation_rules')->nullable(); $table->timestamps(); $table->unique(['module_id','name']);
        });
    }
    public function down(): void { Schema::dropIfExists('builder_fields'); }
};

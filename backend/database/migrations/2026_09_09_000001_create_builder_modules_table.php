<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('builder_modules', function (Blueprint $table) {
            $table->id(); $table->string('name'); $table->string('slug')->unique(); $table->string('table_name')->unique();
            $table->string('icon')->default('database'); $table->text('description')->nullable(); $table->boolean('active')->default(true); $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('builder_modules'); }
};

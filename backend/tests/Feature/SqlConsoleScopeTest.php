<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SqlConsoleScopeTest extends TestCase
{
    use RefreshDatabase;

    private function key(): string
    {
        return (string) config('services.builder_admin_key');
    }

    public function test_query_against_nx_table_succeeds(): void
    {
        $this->postJson('/api/builder/db/query', ['sql' => 'SELECT * FROM nx_configuracion'], ['X-Builder-Key' => $this->key()])
            ->assertOk();
    }

    public function test_query_against_non_nx_table_is_rejected(): void
    {
        Schema::create('other_table', function ($table) {
            $table->id();
            $table->string('secret');
        });

        $this->postJson('/api/builder/db/query', ['sql' => 'SELECT * FROM other_table'], ['X-Builder-Key' => $this->key()])
            ->assertStatus(422);
    }

    public function test_query_against_information_schema_is_allowed(): void
    {
        $this->postJson('/api/builder/db/query', ['sql' => 'SELECT TABLE_NAME FROM information_schema.TABLES LIMIT 1'], ['X-Builder-Key' => $this->key()])
            ->assertOk();
    }
}

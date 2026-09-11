<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseControllerFormRequestsTest extends TestCase
{
    use RefreshDatabase;

    private function key(): string
    {
        return (string) config('services.builder_admin_key');
    }

    public function test_create_table_rejects_invalid_data_type(): void
    {
        $this->postJson('/api/builder/db/tables', [
            'name' => 'widgets',
            'columns' => [['name' => 'title', 'data_type' => 'not-a-real-type']],
        ], ['X-Builder-Key' => $this->key()])->assertStatus(422);
    }

    public function test_create_table_and_add_column_happy_path(): void
    {
        $this->postJson('/api/builder/db/tables', ['name' => 'widgets'], ['X-Builder-Key' => $this->key()])
            ->assertCreated();

        $this->postJson('/api/builder/db/nx_widgets/columns', [
            'name' => 'title', 'data_type' => 'string',
        ], ['X-Builder-Key' => $this->key()])->assertCreated();
    }

    public function test_add_index_rejects_invalid_column_name(): void
    {
        $this->postJson('/api/builder/db/tables', ['name' => 'widgets'], ['X-Builder-Key' => $this->key()])->assertCreated();

        $this->postJson('/api/builder/db/nx_widgets/indexes', [
            'columns' => ['id; DROP TABLE nx_widgets; --'],
        ], ['X-Builder-Key' => $this->key()])->assertStatus(422);
    }
}

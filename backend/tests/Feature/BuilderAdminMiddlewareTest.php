<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuilderAdminMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_correct_key_is_allowed(): void
    {
        $this->getJson('/api/builder/schema/tables', ['X-Builder-Key' => config('services.builder_admin_key')])
            ->assertOk();
    }

    public function test_wrong_key_is_rejected(): void
    {
        $this->getJson('/api/builder/schema/tables', ['X-Builder-Key' => 'wrong-key'])
            ->assertStatus(401);
    }

    public function test_missing_key_configuration_fails_closed(): void
    {
        config(['services.builder_admin_key' => '']);

        $this->getJson('/api/builder/schema/tables', ['X-Builder-Key' => 'anything'])
            ->assertStatus(500);
    }
}

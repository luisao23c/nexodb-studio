<?php

namespace Tests\Unit;

use App\Support\SafeIdentifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SafeIdentifierTest extends TestCase
{
    use RefreshDatabase;

    public function test_rejects_names_without_nx_prefix(): void
    {
        $this->assertFalse(SafeIdentifier::isValidTableName('users'));
        $this->assertFalse(SafeIdentifier::isValidTableName('nx_users; DROP TABLE nx_configuracion; --'));
    }

    public function test_accepts_valid_nx_table_names(): void
    {
        $this->assertTrue(SafeIdentifier::isValidTableName('nx_configuracion'));
    }

    public function test_table_exists_requires_both_valid_name_and_real_table(): void
    {
        $this->assertFalse(SafeIdentifier::tableExists('nx_does_not_exist'));
        $this->assertTrue(SafeIdentifier::tableExists('nx_configuracion'));
    }

    public function test_column_name_rejects_special_characters(): void
    {
        $this->assertFalse(SafeIdentifier::isValidColumnName("name'; DROP TABLE nx_configuracion; --"));
        $this->assertTrue(SafeIdentifier::isValidColumnName('valid_column'));
    }
}

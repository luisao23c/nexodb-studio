<?php

namespace Tests\Unit;

use App\Services\DynamicTableService;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class DynamicTableServiceTest extends TestCase
{
    public function test_enum_values_with_embedded_quotes_are_escaped(): void
    {
        $service = new DynamicTableService;

        $definition = $service->columnDefinition([
            'data_type' => 'enum',
            'enum_values' => "Won't,Can't,Normal",
        ]);

        $this->assertSame("ENUM('Won''t','Can''t','Normal')", $definition);
    }

    public function test_enum_injection_attempt_cannot_break_out_of_the_string_literal(): void
    {
        $service = new DynamicTableService;

        $definition = $service->columnDefinition([
            'data_type' => 'enum',
            'enum_values' => "a') , extra TEXT -- ",
        ]);

        // The malicious payload must end up fully inside quoted enum values,
        // never introducing an unescaped closing quote that breaks out of the literal.
        $this->assertSame("ENUM('a'')','extra TEXT --')", $definition);
    }

    public function test_safe_table_name_rejects_unsafe_input(): void
    {
        $service = new DynamicTableService;

        $this->expectException(ValidationException::class);
        $service->safeTableName('');
    }

    public function test_safe_column_name_rejects_reserved_words(): void
    {
        $service = new DynamicTableService;

        $this->expectException(ValidationException::class);
        $service->safeColumnName('id');
    }
}

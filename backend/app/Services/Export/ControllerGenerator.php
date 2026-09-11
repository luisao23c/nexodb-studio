<?php

namespace App\Services\Export;

use App\Models\BuilderForm;
use App\Models\BuilderFormField;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/** Generates real REST API controllers + FormRequest validation for a set of exported tables. */
class ControllerGenerator
{
    private const SYSTEM_COLUMNS = ['id', 'created_at', 'updated_at', 'deleted_at'];

    public function __construct(private SchemaIntrospector $introspector) {}

    /**
     * @param  string[]  $tableNames
     * @param  Collection<int, BuilderForm>  $forms  forms belonging to the project, used to port real validation rules when available
     * @return array<string, string> filename => contents
     */
    public function generate(array $tableNames, Collection $forms): array
    {
        $files = [];
        foreach ($tableNames as $table) {
            $modelClass = NameResolver::modelClass($table);
            $requestClass = NameResolver::requestClass($table);
            $form = $forms->first(fn (BuilderForm $f) => $f->table_name === $table);

            $files["app/Http/Requests/{$requestClass}.php"] = $this->renderRequest($table, $requestClass, $form);
            $files["app/Http/Controllers/Api/{$modelClass}Controller.php"] = $this->renderController($modelClass, $requestClass);
        }

        return $files;
    }

    private function renderController(string $modelClass, string $requestClass): string
    {
        $var = Str::camel($modelClass);

        return <<<PHP
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\\{$requestClass};
use App\Models\\{$modelClass};
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class {$modelClass}Controller extends Controller
{
    public function index(Request \$request): JsonResponse
    {
        \$perPage = min((int) \$request->query('per_page', 20), 100);

        return response()->json({$modelClass}::query()->paginate(\$perPage));
    }

    public function store({$requestClass} \$request): JsonResponse
    {
        \${$var} = {$modelClass}::create(\$request->validated());

        return response()->json(\${$var}, 201);
    }

    public function show({$modelClass} \${$var}): JsonResponse
    {
        return response()->json(\${$var});
    }

    public function update({$requestClass} \$request, {$modelClass} \${$var}): JsonResponse
    {
        \${$var}->update(\$request->validated());

        return response()->json(\${$var}->fresh());
    }

    public function destroy({$modelClass} \${$var}): JsonResponse
    {
        \${$var}->delete();

        return response()->json(null, 204);
    }
}

PHP;
    }

    private function renderRequest(string $table, string $requestClass, ?BuilderForm $form): string
    {
        $rules = $form ? $this->rulesFromForm($form) : $this->rulesFromColumns($table);
        $rulesBlock = implode("\n", array_map(
            fn ($field, $rule) => "            '{$field}' => '{$rule}',",
            array_keys($rules), $rules
        ));

        return <<<PHP
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class {$requestClass} extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
{$rulesBlock}
        ];
    }
}

PHP;
    }

    /** Ports validation from the project's own form designer (required, min/max length, pattern, email). */
    private function rulesFromForm(BuilderForm $form): array
    {
        $rules = [];
        /** @var BuilderFormField $field */
        foreach ($form->fields as $field) {
            if (in_array($field->field_type, ['heading', 'divider', 'button'], true)) {
                continue;
            }
            $config = $field->config ?? [];
            $isRelation = ($config['options_source'] ?? null) === 'relation';
            $parts = [$field->required ? 'required' : 'nullable'];
            $parts[] = match (true) {
                $isRelation => 'integer',
                $field->field_type === 'number' => 'numeric',
                $field->field_type === 'email' => 'email',
                in_array($field->field_type, ['date', 'datetime'], true) => 'date',
                in_array($field->field_type, ['checkbox', 'switch'], true) => 'boolean',
                default => 'string',
            };
            if (! empty($config['min_length'])) {
                $parts[] = "min:{$config['min_length']}";
            }
            if (! empty($config['max_length'])) {
                $parts[] = "max:{$config['max_length']}";
            }
            if (! empty($config['min_value'])) {
                $parts[] = "min:{$config['min_value']}";
            }
            if (! empty($config['max_value'])) {
                $parts[] = "max:{$config['max_value']}";
            }
            $column = $field->source_column ?: $field->field_key;
            $rules[$column] = implode('|', $parts);
        }

        return $rules;
    }

    /** Falls back to basic rules derived from the live column nullability/type when no form exists for this table. */
    private function rulesFromColumns(string $table): array
    {
        $rules = [];
        foreach ($this->introspector->columns($table) as $column) {
            if (in_array($column['name'], self::SYSTEM_COLUMNS, true)) {
                continue;
            }
            $type = strtolower($column['type']);
            $base = match (true) {
                str_starts_with($type, 'tinyint(1)') => 'boolean',
                (bool) preg_match('/^(bigint|int|smallint|tinyint|decimal|float|double)/', $type) => 'numeric',
                in_array($type, ['date', 'datetime', 'timestamp']) => 'date',
                default => 'string',
            };
            // A NOT NULL column with a DB-level default (e.g. `orden` defaulting to 0) doesn't need
            // to be supplied by the client — only truly required-with-no-default columns are required.
            $mustSupply = ! $column['nullable'] && $column['default'] === null;
            $rules[$column['name']] = ($mustSupply ? 'required' : 'nullable').'|'.$base;
        }

        return $rules;
    }
}

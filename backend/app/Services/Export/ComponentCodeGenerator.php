<?php

namespace App\Services\Export;

use App\Models\BuilderChart;
use App\Models\BuilderForm;
use App\Models\BuilderFormField;
use App\Models\BuilderView;
use App\Models\BuilderViewColumn;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Translates a PageComponent tree (frontend/src/components/ComponentPalette.tsx's 18 types) into real,
 * static JSX — not a runtime interpreter. Container types (columns/card/tabs/button-modal) recurse for real.
 */
class ComponentCodeGenerator
{
    /** Named React components hoisted above the page (currently: one per modal button), collected while rendering. */
    private array $extraComponents = [];

    private int $modalCounter = 0;

    /**
     * @param  Collection<int, BuilderForm>  $forms
     * @param  Collection<int, BuilderView>  $views
     * @param  Collection<int, BuilderChart>  $charts
     */
    public function __construct(
        private Collection $forms,
        private Collection $views,
        private Collection $charts,
    ) {}

    /** @param  array<int, array>  $components */
    public function renderTree(array $components): string
    {
        return implode("\n", array_map(fn ($c) => $this->renderComponent($c), $components));
    }

    public function flushExtraComponents(): string
    {
        $code = implode("\n\n", $this->extraComponents);
        $this->extraComponents = [];

        return $code;
    }

    private function renderComponent(array $comp): string
    {
        $type = $comp['type'] ?? 'unknown';
        $config = is_array($comp['config'] ?? null) ? $comp['config'] : [];
        $label = (string) ($comp['label'] ?? '');

        return match ($type) {
            'text' => $this->text($config),
            'heading' => $this->heading($config),
            'image' => $this->image($config),
            'divider' => $this->divider($config),
            'spacer' => $this->spacer($config),
            'code' => $this->code($config),
            'alert' => $this->alert($config),
            'badge' => $this->badge($config),
            'form' => $this->form($config, $label),
            'table' => $this->table($config, $label),
            'chart' => $this->chart($config, $label),
            'list' => $this->list($config, $label),
            'table_detail' => $this->tableDetail($config, $label),
            'button' => $this->button($config, $label),
            'columns' => $this->columns($config),
            'card' => $this->card($config),
            'tabs' => $this->tabs($config),
            default => '<div>{'.$this->js($label).'}</div>',
        };
    }

    private function text(array $c): string
    {
        $align = $c['align'] ?? 'left';
        $size = match ($c['size'] ?? 'base') {
            'sm' => '13px', 'lg' => '18px', 'xl' => '24px', default => '15px'
        };

        return "<p style={{textAlign:'{$align}', fontSize:'{$size}'}}>{".$this->js($c['content'] ?? '').'}</p>';
    }

    private function heading(array $c): string
    {
        $tag = in_array($c['level'] ?? 'h2', ['h1', 'h2', 'h3', 'h4'], true) ? $c['level'] : 'h2';

        return "<{$tag}>{".$this->js($c['text'] ?? '')."}</{$tag}>";
    }

    private function image(array $c): string
    {
        $src = $this->js($c['src'] ?? '');
        $alt = $this->js($c['alt'] ?? '');
        $width = $this->js($c['width'] ?? '100%');

        return "<img src={{$src}} alt={{$alt}} style={{width:{$width}}} />";
    }

    private function divider(array $c): string
    {
        $style = $c['style'] ?? 'solid';

        return "<hr style={{borderStyle:'{$style}'}} />";
    }

    private function spacer(array $c): string
    {
        $height = (int) ($c['height'] ?? 24);

        return "<div style={{height:{$height}}} />";
    }

    private function code(array $c): string
    {
        return '<pre><code>{'.$this->js($c['code'] ?? '').'}</code></pre>';
    }

    private function alert(array $c): string
    {
        $type = $c['type'] ?? 'info';
        $colors = ['info' => '#0369a1', 'success' => '#087b5f', 'warning' => '#8e611a', 'error' => '#a52240'];
        $color = $colors[$type] ?? $colors['info'];

        return "<div style={{padding:12, borderRadius:10, background:'#f0f9ff', color:'{$color}'}}>{".$this->js($c['message'] ?? '').'}</div>';
    }

    private function badge(array $c): string
    {
        $color = $this->js($c['color'] ?? '#6366f1');

        return "<span className=\"badge\" style={{background:{$color}, color:'#fff'}}>{".$this->js($c['label'] ?? '').'}</span>';
    }

    private function form(array $c, string $label): string
    {
        $form = $this->forms->get((int) ($c['form_id'] ?? 0));
        if (! $form) {
            return $this->missing('Formulario no configurado.');
        }
        $resource = NameResolver::routeSegment($form->table_name);
        $fields = [];
        /** @var BuilderFormField $field */
        foreach ($form->fields as $field) {
            if (in_array($field->field_type, ['heading', 'divider', 'button', 'hidden'], true)) {
                continue;
            }
            $def = [
                'name' => $field->source_column ?: $field->field_key,
                'label' => $field->label,
                'type' => $this->mapFieldType($field->field_type),
                'required' => (bool) $field->required,
                'helpText' => $field->help_text,
            ];
            $config = $field->config ?? [];
            if (($config['options_source'] ?? null) === 'relation' && ! empty($config['relation_table'])) {
                $def['optionsResource'] = NameResolver::routeSegment($config['relation_table']);
                $def['optionsValueKey'] = $config['relation_value_column'] ?? 'id';
                $def['optionsLabelKey'] = $config['relation_label_column'] ?? 'id';
            } elseif (is_array($field->options)) {
                $def['options'] = array_map(fn ($o) => ['value' => (string) $o, 'label' => (string) $o], $field->options);
            }
            $fields[] = $def;
        }
        $fieldsJson = json_encode(array_values($fields), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $title = ($c['show_title'] ?? true) !== false ? '<h2>{'.$this->js($c['title'] ?? $label).'}</h2>' : '';

        return "<div>{$title}<GeneratedForm resource=".$this->js($resource).' submitLabel='.$this->js($form->submit_label)." fields={{$fieldsJson}} /></div>";
    }

    private function table(array $c, string $label): string
    {
        $view = $this->views->get((int) ($c['view_id'] ?? 0));
        if (! $view) {
            return $this->missing('Vista no configurada.');
        }
        $resource = NameResolver::routeSegment($view->table_name);
        /** @var Collection<int, BuilderViewColumn> $viewColumns */
        $viewColumns = collect($view->columns);
        $columns = $viewColumns->filter(fn ($col) => $col->visible)->map(fn ($col) => [
            'key' => $col->column_key, 'label' => $col->label, 'displayType' => $col->display_type,
        ])->values()->all();
        $columnsJson = json_encode($columns, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $title = ($c['show_title'] ?? true) !== false ? '<h2>{'.$this->js($c['title'] ?? $label).'}</h2>' : '';

        return "<div>{$title}<GeneratedTable resource=".$this->js($resource).' primaryKey='.$this->js($view->primary_key)." columns={{$columnsJson}} /></div>";
    }

    private function chart(array $c, string $label): string
    {
        $chart = $this->charts->get((int) ($c['chart_id'] ?? 0));
        if (! $chart) {
            return $this->missing('Gráfica no configurada.');
        }
        $resource = NameResolver::routeSegment($chart->table_name);
        $title = ($c['show_title'] ?? true) !== false ? '<h2>{'.$this->js($c['title'] ?? $label).'}</h2>' : '';
        $valueField = $chart->value_field ? 'valueField='.$this->js($chart->value_field) : '';

        return "<div>{$title}<GeneratedChart resource=".$this->js($resource).' labelField='.$this->js($chart->label_field)." {$valueField} aggregate=".$this->js($chart->aggregate).' color='.$this->js($chart->color).' /></div>';
    }

    private function list(array $c, string $label): string
    {
        $table = $c['table_name'] ?? '';
        if (! $table) {
            return $this->missing('Lista no configurada.');
        }
        $resource = NameResolver::routeSegment($table);

        return '<div><h3>{'.$this->js($label).'}</h3><GeneratedList resource='.$this->js($resource).' displayField='.$this->js($c['display_field'] ?? 'id').' /></div>';
    }

    private function tableDetail(array $c, string $label): string
    {
        $table = $c['table_name'] ?? '';
        if (! $table) {
            return $this->missing('Detalle no configurado.');
        }
        $resource = NameResolver::routeSegment($table);
        $header = ($c['show_header'] ?? true) !== false ? '<h3>{'.$this->js($label).'}</h3>' : '';

        return "<div>{$header}<GeneratedDetail resource=".$this->js($resource).' /></div>';
    }

    private function button(array $c, string $label): string
    {
        $text = $this->js($c['label'] ?? $label);
        $variant = $c['variant'] ?? 'primary';
        $action = $c['action'] ?? 'none';
        $className = $this->js('button '.($variant === 'primary' ? '' : $variant));

        if ($action === 'url') {
            return '<Link to='.$this->js($c['url'] ?? '/')." className={{$className}}>{{$text}}</Link>";
        }

        if ($action === 'modal') {
            $modalComponents = is_array($c['modal_components'] ?? null) ? $c['modal_components'] : [];
            $inner = $this->renderTree($modalComponents);
            $name = 'ModalButton'.(++$this->modalCounter).'_'.Str::random(4);
            $modalTitle = $this->js($c['modal_title'] ?? $label);
            $this->extraComponents[] = <<<TSX
function {$name}() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={{$className}} onClick={() => setOpen(true)}>{{$text}}</button>
      {open && (
        <div style={{position:'fixed', inset:0, background:'rgba(15,23,42,.5)', display:'grid', placeItems:'center', zIndex:100}} onClick={() => setOpen(false)}>
          <div className="panel" style={{maxWidth:560, width:'100%'}} onClick={(e) => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
              <strong>{{$modalTitle}}</strong>
              <button className="secondary" onClick={() => setOpen(false)}>Cerrar</button>
            </div>
            {$inner}
          </div>
        </div>
      )}
    </>
  );
}
TSX;

            return "<{$name} />";
        }

        return "<button className={{$className}}>{{$text}}</button>";
    }

    private function columns(array $c): string
    {
        $count = max(1, min(4, (int) ($c['columns'] ?? 2)));
        $gap = (int) ($c['gap'] ?? 16);
        $children = is_array($c['children'] ?? null) ? $c['children'] : [];
        $cols = [];
        for ($i = 0; $i < $count; $i++) {
            $col = is_array($children[$i] ?? null) ? $children[$i] : [];
            $cols[] = '<div>'.$this->renderTree($col).'</div>';
        }
        $colsJoined = implode("\n", $cols);

        return "<div style={{display:'grid', gridTemplateColumns:'repeat({$count}, minmax(0,1fr))', gap:{$gap}}}>\n{$colsJoined}\n</div>";
    }

    private function card(array $c): string
    {
        $title = $this->js($c['title'] ?? '');
        $subtitle = ! empty($c['subtitle']) ? '<small>{'.$this->js($c['subtitle']).'}</small>' : '';
        $children = is_array($c['children'] ?? null) ? $c['children'] : [];

        return "<div className=\"panel\"><div><strong>{{$title}}</strong>{$subtitle}</div><div>".$this->renderTree($children).'</div></div>';
    }

    private function tabs(array $c): string
    {
        $tabs = is_array($c['tabs'] ?? null) ? $c['tabs'] : [];
        $name = 'Tabs'.(++$this->modalCounter).'_'.Str::random(4);
        $panels = [];
        $buttons = [];
        foreach ($tabs as $i => $tab) {
            $tabComponents = $this->normalizeTabComponents($tab, $i);
            $label = $this->js($tab['label'] ?? "Pestaña {$i}");
            $buttons[] = '<button className="secondary" style={{fontWeight: active==='.$i." ? 700 : 400}} onClick={() => setActive({$i})}>{{$label}}</button>";
            $panels[] = '{active==='.$i.' && (<div>'.$this->renderTree($tabComponents).'</div>)}';
        }
        $buttonsJoined = implode("\n      ", $buttons);
        $panelsJoined = implode("\n      ", $panels);
        $this->extraComponents[] = <<<TSX
function {$name}() {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div style={{display:'flex', gap:6, marginBottom:12}}>
      {$buttonsJoined}
      </div>
      {$panelsJoined}
    </div>
  );
}
TSX;

        return "<{$name} />";
    }

    /** Mirrors normalizeTabs() in ComponentPalette.tsx: a legacy tab with no `components` but a `resource_id` synthesizes a single form/table component. */
    private function normalizeTabComponents(array $tab, int $index): array
    {
        $components = is_array($tab['components'] ?? null) ? $tab['components'] : [];
        if (count($components) === 0 && ! empty($tab['resource_id'])) {
            $type = ($tab['content_type'] ?? null) === 'view' ? 'table' : 'form';
            $components = [[
                'id' => "legacy_{$index}_{$tab['resource_id']}",
                'type' => $type,
                'label' => $type === 'table' ? 'Vista creada' : 'Formulario creado',
                'config' => $type === 'table'
                    ? ['view_id' => $tab['resource_id'], 'show_title' => true]
                    : ['form_id' => $tab['resource_id'], 'show_title' => true],
            ]];
        }

        return $components;
    }

    private function missing(string $message): string
    {
        return '<p style={{color:"#dc4564"}}>{'.$this->js($message).'}</p>';
    }

    private function mapFieldType(string $fieldType): string
    {
        return match ($fieldType) {
            'textarea' => 'textarea',
            'number' => 'number',
            'email' => 'email',
            'password' => 'password',
            'date' => 'date',
            'datetime' => 'datetime',
            'select', 'autocomplete', 'radio', 'multiselect' => 'select',
            'checkbox', 'switch' => 'checkbox',
            default => 'text',
        };
    }

    /** Safely embeds an arbitrary PHP string as a JS string-literal expression inside JSX (e.g. `{$this->js($x)}`). */
    private function js(mixed $value): string
    {
        return json_encode((string) $value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

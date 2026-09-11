<?php

namespace App\Services\Export;

/**
 * Generates the static parts of the exported frontend: the Vite+React+TS scaffold and the shared,
 * genuinely reusable components (GeneratedForm/Table/Chart/List/Detail) that page components compose.
 * None of this depends on project data — it's the same for every export.
 */
class FrontendScaffoldGenerator
{
    /** @return array<string, string> filename => contents */
    public function generate(string $projectName): array
    {
        $files = [];
        $files['frontend/package.json'] = $this->packageJson($projectName);
        $files['frontend/vite.config.ts'] = $this->viteConfig();
        $files['frontend/tsconfig.json'] = $this->tsconfig();
        $files['frontend/tsconfig.node.json'] = $this->tsconfigNode();
        $files['frontend/index.html'] = $this->indexHtml($projectName);
        $files['frontend/src/main.tsx'] = $this->mainTsx();
        $files['frontend/src/styles.css'] = $this->stylesCss();
        $files['frontend/src/api/client.ts'] = $this->apiClient();
        $files['frontend/src/components/generated/GeneratedForm.tsx'] = $this->generatedForm();
        $files['frontend/src/components/generated/GeneratedTable.tsx'] = $this->generatedTable();
        $files['frontend/src/components/generated/GeneratedChart.tsx'] = $this->generatedChart();
        $files['frontend/src/components/generated/GeneratedList.tsx'] = $this->generatedList();
        $files['frontend/src/components/generated/GeneratedDetail.tsx'] = $this->generatedDetail();
        $files['frontend/src/components/generated/formatValue.ts'] = $this->formatValue();
        $files['frontend/.env.example'] = "VITE_API_URL=http://localhost:8000/api\n";
        $files['frontend/.gitignore'] = "node_modules/\ndist/\n.env\n";

        return $files;
    }

    private function packageJson(string $projectName): string
    {
        $name = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $projectName));

        return <<<JSON
{
  "name": "{$name}-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-router-dom": "^7.18.3"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.1.10",
    "@types/react-dom": "^19.1.7",
    "@vitejs/plugin-react": "^5.0.2",
    "typescript": "~5.8.3",
    "vite": "^7.1.4"
  }
}

JSON;
    }

    private function viteConfig(): string
    {
        return <<<'TS'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});

TS;
    }

    private function tsconfig(): string
    {
        return <<<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "types": ["vite/client"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}

JSON;
    }

    private function tsconfigNode(): string
    {
        return <<<'JSON'
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}

JSON;
    }

    private function indexHtml(string $projectName): string
    {
        $title = htmlspecialchars($projectName, ENT_QUOTES);

        return <<<HTML
<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{$title}</title>
</head>
<body>
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
</body>
</html>

HTML;
    }

    private function mainTsx(): string
    {
        return <<<'TSX'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

TSX;
    }

    private function stylesCss(): string
    {
        return <<<'CSS'
:root { color-scheme: light; font-family: system-ui, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; background: #f6f7fb; color: #172033; }
.app-shell { min-height: 100vh; display: flex; }
.sidebar { width: 240px; flex: 0 0 auto; background: #101526; color: #fff; padding: 20px 14px; }
.sidebar h1 { font-size: 1.1rem; margin: 0 0 20px; }
.sidebar nav { display: flex; flex-direction: column; gap: 4px; }
.sidebar a { color: #cbd5e1; text-decoration: none; padding: 8px 10px; border-radius: 8px; font-size: .85rem; }
.sidebar a.active, .sidebar a:hover { background: rgba(255,255,255,.08); color: #fff; }
.main { flex: 1; min-width: 0; padding: 28px clamp(16px,4vw,48px); }
.panel { background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #edf0f3; font-size: .85rem; }
th { text-transform: uppercase; font-size: .68rem; color: #687386; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
input, select, textarea { border: 1px solid #dfe4ea; border-radius: 8px; padding: 8px 10px; font: inherit; width: 100%; }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: .78rem; font-weight: 600; }
.field small.error { color: #dc4564; }
.input-filled input, .input-filled select, .input-filled textarea { border-color: transparent; background: #f0f2f6; }
.input-underline input, .input-underline select, .input-underline textarea { border-width: 0 0 2px; border-radius: 0; background: transparent; }
.input-floating .field { position: relative; padding-top: 6px; }
.input-floating .field > label { position: absolute; z-index: 1; top: 0; left: 8px; padding: 0 4px; background: #fff; color: #6257e8; font-size: .65rem; }
.input-floating .field > input, .input-floating .field > select, .input-floating .field > textarea { padding-top: 12px; }
button { border: 0; border-radius: 8px; padding: 9px 16px; background: #6257e8; color: #fff; font-weight: 600; cursor: pointer; }
button.secondary { background: #edf0f4; color: #172033; }
.pagination { display: flex; gap: 8px; margin-top: 12px; align-items: center; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: .7rem; font-weight: 700; }

CSS;
    }

    private function apiClient(): string
    {
        return <<<'TS'
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({} as { message?: string; errors?: Record<string, string[]> }));
    const validation = body.errors ? Object.values(body.errors).flat().join(' ') : '';
    throw new Error(validation || body.message || `Error ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export type Paginated<T> = { data: T[]; total: number; current_page: number; last_page: number; per_page: number };

export const api = {
  list: <T,>(resource: string, page = 1, search = '', perPage = 20) =>
    request<Paginated<T>>(`/${resource}?page=${page}&per_page=${perPage}&search=${encodeURIComponent(search)}`),
  all: <T,>(resource: string) => request<Paginated<T>>(`/${resource}?per_page=1000`),
  get: <T,>(resource: string, id: number | string) => request<T>(`/${resource}/${id}`),
  create: <T,>(resource: string, data: Record<string, unknown>) =>
    request<T>(`/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
  update: <T,>(resource: string, id: number | string, data: Record<string, unknown>) =>
    request<T>(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (resource: string, id: number | string) => request<void>(`/${resource}/${id}`, { method: 'DELETE' }),
};

TS;
    }

    private function formatValue(): string
    {
        return <<<'TS'
export type DisplayType = 'text' | 'number' | 'money' | 'date' | 'datetime' | 'badge' | 'boolean' | 'image' | 'link' | 'email' | 'json';

/** Formats a raw API value for display according to a view column's display_type — mirrors the Studio's own formatter. */
export function formatValue(value: unknown, displayType: DisplayType): string {
  if (value === null || value === undefined) return '—';
  switch (displayType) {
    case 'boolean': return Number(value) ? 'Sí' : 'No';
    case 'money': return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value));
    case 'json': return typeof value === 'string' ? value : JSON.stringify(value);
    case 'date': return new Date(String(value)).toLocaleDateString('es-MX');
    case 'datetime': return new Date(String(value)).toLocaleString('es-MX');
    default: return String(value);
  }
}

TS;
    }

    private function generatedForm(): string
    {
        return <<<'TSX'
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';

export type GeneratedFieldType = 'text' | 'textarea' | 'number' | 'email' | 'password' | 'date' | 'datetime' | 'select' | 'checkbox';

export interface GeneratedFieldDef {
  name: string;
  label: string;
  type: GeneratedFieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** For relation-backed selects: fetches `optionsResource` and maps value/label columns client-side, instead of static `options`. */
  optionsResource?: string;
  optionsValueKey?: string;
  optionsLabelKey?: string;
  helpText?: string | null;
}

/** A real, generic, editable form component: renders fields, validates, and POSTs/PUTs to the generated API. */
export function GeneratedForm({ resource, fields, submitLabel = 'Guardar', recordId, initialValues, onSaved }: {
  resource: string;
  fields: GeneratedFieldDef[];
  submitLabel?: string;
  recordId?: number | string;
  initialValues?: Record<string, unknown>;
  onSaved?: (record: unknown) => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [relationOptions, setRelationOptions] = useState<Record<string, { value: string; label: string }[]>>({});

  useEffect(() => {
    fields.filter((f) => f.optionsResource).forEach((field) => {
      api.all<Record<string, unknown>>(field.optionsResource!).then((result) => {
        const valueKey = field.optionsValueKey ?? 'id';
        const labelKey = field.optionsLabelKey ?? 'id';
        setRelationOptions((prev) => ({
          ...prev,
          [field.name]: result.data.map((row) => ({ value: String(row[valueKey]), label: String(row[labelKey]) })),
        }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(name: string, value: unknown) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !values[field.name]) next[field.name] = `${field.label} es obligatorio.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setStatus('');
    try {
      const record = recordId
        ? await api.update(resource, recordId, values)
        : await api.create(resource, values);
      setStatus('Guardado.');
      onSaved?.(record);
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      {fields.map((field) => (
        <div className="field" key={field.name}>
          <label htmlFor={field.name}>{field.label}{field.required && ' *'}</label>
          {field.type === 'textarea' ? (
            <textarea id={field.name} value={String(values[field.name] ?? '')} onChange={(e) => set(field.name, e.target.value)} />
          ) : field.type === 'checkbox' ? (
            <input id={field.name} type="checkbox" checked={Boolean(values[field.name])} onChange={(e) => set(field.name, e.target.checked)} />
          ) : field.type === 'select' ? (
            <select id={field.name} value={String(values[field.name] ?? '')} onChange={(e) => set(field.name, e.target.value)}>
              <option value="">Selecciona…</option>
              {(relationOptions[field.name] ?? field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input id={field.name} type={field.type === 'datetime' ? 'datetime-local' : field.type} value={String(values[field.name] ?? '')} onChange={(e) => set(field.name, e.target.value)} />
          )}
          {field.helpText && <small>{field.helpText}</small>}
          {errors[field.name] && <small className="error">{errors[field.name]}</small>}
        </div>
      ))}
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="submit" disabled={saving}>{saving ? 'Guardando…' : submitLabel}</button>
        {status && <span>{status}</span>}
      </div>
    </form>
  );
}

TSX;
    }

    private function generatedTable(): string
    {
        return <<<'TSX'
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { formatValue, type DisplayType } from './formatValue';

export interface GeneratedColumnDef {
  key: string;
  label: string;
  displayType: DisplayType;
}

/** A real, generic, editable paginated data table: fetches from the generated API, formats cells, supports search. */
export function GeneratedTable({ resource, columns, primaryKey = 'id', onEdit, onDelete }: {
  resource: string;
  columns: GeneratedColumnDef[];
  primaryKey?: string;
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.list<Record<string, unknown>>(resource, page, search).then((result) => {
      if (cancelled) return;
      setRows(result.data);
      setLastPage(result.last_page);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resource, page, search]);

  return (
    <div>
      <div className="toolbar">
        <input placeholder="Buscar…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 260 }} />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key}>{c.label}</th>)}
              {(onEdit || onDelete) && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 1}>Cargando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length + 1}>Sin registros.</td></tr>
            ) : rows.map((row) => (
              <tr key={String(row[primaryKey])}>
                {columns.map((c) => <td key={c.key}>{formatValue(row[c.key], c.displayType)}</td>)}
                {(onEdit || onDelete) && (
                  <td>
                    {onEdit && <button className="secondary" onClick={() => onEdit(row)}>Editar</button>}{' '}
                    {onDelete && <button className="secondary" onClick={() => onDelete(row)}>Eliminar</button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
        <span>{page} / {lastPage}</span>
        <button className="secondary" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
      </div>
    </div>
  );
}

TSX;
    }

    private function generatedChart(): string
    {
        return <<<'TSX'
import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export type ChartAggregate = 'count' | 'sum' | 'avg' | 'min' | 'max';

/** A real, dependency-free SVG chart: fetches the resource's rows and aggregates them client-side by labelField. */
export function GeneratedChart({ resource, labelField, valueField, aggregate, color = '#6257e8' }: {
  resource: string;
  labelField: string;
  valueField?: string;
  aggregate: ChartAggregate;
  color?: string;
}) {
  const [data, setData] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    api.all<Record<string, unknown>>(resource).then((result) => {
      const groups = new Map<string, number[]>();
      for (const row of result.data) {
        const label = String(row[labelField] ?? 'Sin valor');
        const value = valueField ? Number(row[valueField]) || 0 : 1;
        groups.set(label, [...(groups.get(label) ?? []), value]);
      }
      const rows = Array.from(groups.entries()).map(([label, values]) => ({
        label,
        value: aggregate === 'sum' || aggregate === 'count' ? values.reduce((a, b) => a + b, 0)
          : aggregate === 'avg' ? values.reduce((a, b) => a + b, 0) / values.length
          : aggregate === 'min' ? Math.min(...values)
          : Math.max(...values),
      }));
      setData(rows);
    });
  }, [resource, labelField, valueField, aggregate]);

  if (!data.length) return <p>Sin datos para graficar.</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 480;
  const barWidth = width / data.length;

  return (
    <svg viewBox={`0 0 ${width} 220`} style={{ width: '100%', height: 220 }}>
      {data.map((d, i) => {
        const height = (d.value / max) * 160;
        return (
          <g key={d.label} transform={`translate(${i * barWidth}, 0)`}>
            <rect x={barWidth * 0.15} y={180 - height} width={barWidth * 0.7} height={height} fill={color} rx={4} />
            <text x={barWidth / 2} y={196} textAnchor="middle" fontSize="9">{d.label.slice(0, 10)}</text>
            <text x={barWidth / 2} y={180 - height - 4} textAnchor="middle" fontSize="10" fontWeight="700">{d.value.toLocaleString('es-MX')}</text>
          </g>
        );
      })}
    </svg>
  );
}

TSX;
    }

    private function generatedList(): string
    {
        return <<<'TSX'
import { useEffect, useState } from 'react';
import { api } from '../../api/client';

/** A real, simple list component: fetches a resource and renders one field per row. */
export function GeneratedList({ resource, displayField, primaryKey = 'id' }: { resource: string; displayField: string; primaryKey?: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.all<Record<string, unknown>>(resource).then((result) => setRows(result.data));
  }, [resource]);

  return (
    <ul>
      {rows.map((row) => <li key={String(row[primaryKey])}>{String(row[displayField] ?? '—')}</li>)}
    </ul>
  );
}

TSX;
    }

    private function generatedDetail(): string
    {
        return <<<'TSX'
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';

/** A real, simple detail view: reads :id from the URL and shows every field of that record. */
export function GeneratedDetail({ resource }: { resource: string }) {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (id) api.get<Record<string, unknown>>(resource, id).then(setRecord);
  }, [resource, id]);

  if (!record) return <p>Cargando…</p>;

  return (
    <dl>
      {Object.entries(record).map(([key, value]) => (
        <div key={key} style={{ marginBottom: 8 }}>
          <dt style={{ fontWeight: 700, fontSize: '.75rem', textTransform: 'uppercase', color: '#687386' }}>{key}</dt>
          <dd style={{ margin: 0 }}>{String(value ?? '—')}</dd>
        </div>
      ))}
    </dl>
  );
}

TSX;
    }
}

import { useEffect, useRef, useState } from 'react';
import { Code2, LoaderCircle, Play, Plus, Save, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import type { CodePage, Module } from '../types';

/** Generates a ready-to-edit React page that talks to the live API. */
export function reactTemplate(pageName:string, moduleName:string, fields:{name:string;label:string}[]):string {
  const comp = pageName.replace(/[^a-zA-Z0-9]/g,'')||'MiPagina';
  return `import { useEffect, useState } from 'react';

// Registros de "${moduleName}" consumiendo la API de NexoDB.
const API = import.meta.env.VITE_API_URL;
const KEY = import.meta.env.VITE_BUILDER_KEY;

export default function ${comp}() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(\`\${API}/builder/modules/${moduleName}/records\`, { headers: { 'X-Builder-Key': KEY, Accept: 'application/json' } })
      .then(r => r.json())
      .then(p => setRows(p.data ?? []))
      .catch(e => setError(String(e)));
  }, []);

  return (
    <div className="nx-page">
      <h1>${pageName}</h1>
      {error && <p className="nx-error">{error}</p>}
      <table className="nx-table">
        <thead><tr>
          ${fields.map(f=>`<th>${f.label}</th>`).join('\n          ')}
        </tr></thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              ${fields.map(f=>`<td>{row.${f.name}}</td>`).join('\n              ')}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;
}

export function CodeStudio({modules}:{modules:Module[]}) {
  const [pages,setPages] = useState<CodePage[]>([]);
  const [activeId,setActiveId] = useState<number|null>(null);
  const [code,setCode] = useState('');
  const [name,setName] = useState('');
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [status,setStatus] = useState('');
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [previewDoc,setPreviewDoc] = useState('');

  useEffect(()=>{void (async()=>{ try{ const list=await api.pages(); setPages(list); if(list[0]) void openPage(list[0].id);}finally{ setLoading(false);} })();},[]);

  async function openPage(id:number){ const p = await api.page(id); setActiveId(p.id); setName(p.name); setCode(p.code); setPreviewDoc(p.code); setStatus(''); }
  async function createPage(){ const n = prompt('Nombre de la nueva página:'); if(!n?.trim())return;
    const p = await api.createPage({name:n.trim()}); setPages(v=>[...v,{...p,code:p.code}]); await openPage(p.id); }
  async function save(){ if(!activeId)return; setSaving(true); try{ await api.updatePage(activeId,{code,name}); setPages(v=>v.map(p=>p.id===activeId?{...p,code,name}:p)); setStatus('Guardado ✓'); setTimeout(()=>setStatus(''),2000); }finally{ setSaving(false); } }
  async function remove(id:number){ if(!confirm('¿Eliminar esta página?'))return; await api.deletePage(id); const rest=pages.filter(p=>p.id!==id); setPages(rest); setActiveId(null); setCode(''); setName(''); }
  function runPreview(){ setPreviewDoc(code); }
  async function generateReact(){ const n = prompt('Nombre del componente React:','MiVista'); if(!n?.trim())return;
    const mod = modules[0]; const fields = mod?.fields.map(f=>({name:f.name,label:f.label}))??[];
    setCode(reactTemplate(n, mod?.table_name??'tabla', fields)); setStatus('Plantilla React generada — revísala y guárdala'); }

  if(loading) return <div className="center-state small"><LoaderCircle className="spin"/><p>Cargando páginas…</p></div>;

  return <div className="code-studio">
    <aside className="panel code-pages">
      <div className="panel-head slim"><div><span className="kicker"><Code2 size={13}/>Constructor</span><h2>Páginas</h2></div><button className="icon-button" onClick={()=>void createPage()} aria-label="Nueva página"><Plus size={16}/></button></div>
      {pages.map(p=><div key={p.id} className={`page-row ${activeId===p.id?'active':''}`} onClick={()=>void openPage(p.id)}>
        <Code2 size={14}/><strong>{p.name}</strong><button className="row-delete" onClick={e=>{e.stopPropagation();void remove(p.id);}}><Trash2 size={13}/></button>
      </div>)}
      {!pages.length&&<p className="empty-cell small">Sin páginas. Crea una con +.</p>}
    </aside>
    <section className="code-main">
      {activeId?<div className="panel code-panel">
        <div className="panel-head slim">
          <input className="code-name" value={name} onChange={e=>setName(e.target.value)} aria-label="Nombre"/>
          <div className="code-actions">
            <button className="button ghost" onClick={()=>void generateReact()}>⚡ Plantilla React</button>
            <button className="button ghost" onClick={runPreview}><Play size={15}/>Ejecutar</button>
            <button className="button primary" onClick={()=>void save()} disabled={saving}>{saving?<LoaderCircle className="spin" size={15}/>:<Save size={15}/>}Guardar</button>
          </div>
        </div>
        {status&&<p className="save-status">{status}</p>}
        <div className="code-split">
          <textarea className="code-editor" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();runPreview();}}} spellCheck={false} aria-label="Código"/>
          <iframe ref={previewRef} title="Vista previa" sandbox="allow-scripts" className="code-preview"
            srcDoc={`<!doctype html><html><head><style>body{font-family:'DM Sans',sans-serif;padding:18px;margin:0}.nx-table{width:100%;border-collapse:collapse}.nx-table th{background:#f4f5f9;text-align:left;padding:8px 10px;font-size:.72rem;text-transform:uppercase}.nx-table td{padding:9px 10px;border-top:1px solid #e8ebef;font-size:.84rem}.nx-error{color:#dc4564}</style></head><body>${previewDoc}</body></html>`}/>
        </div>
      </div>:<div className="panel empty-chart-card"><Code2 size={40}/><h3>Constructor de páginas</h3><p>Crea una página, edítala y previsualízala. Usa la plantilla React para empezar con código que consulta tus módulos.</p></div>}
    </section>
  </div>;
}

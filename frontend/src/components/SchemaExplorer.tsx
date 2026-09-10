import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Braces, Calendar, Check, CheckCircle, ChevronLeft, ChevronRight, Clock, Code2, Database, Download, Eraser, GitBranch, Hash, Key, Link, LoaderCircle, Mail, Pencil, Phone, Play, Plus, RefreshCw, Search, Sigma, Sparkles, Table2, Text, Trash2, Unlink, Upload, User, X, History as HistoryIcon } from 'lucide-react';
import { api } from '../api/client';
import { AuditTab, DbDashboard } from './DbDashboard';
import type { DbOverviewTable, RelationOption, SchemaColumn, SchemaRelationModule, SchemaTable, SchemaTableDetail } from '../types';

const DDL_TYPES = [
  { v:'string', l:'VARCHAR', g:'Texto', icon:Text, color:'#0ea5e9', desc:'Texto corto (255)', sample:'"Hola"', phy:'varchar(:length)' },
  { v:'text', l:'TEXT', g:'Texto', icon:Text, color:'#0ea5e9', desc:'Texto largo', sample:'Descripción…', phy:'text' },
  { v:'mediumtext', l:'MEDIUMTEXT', g:'Texto', icon:Text, color:'#38bdf8', desc:'Texto medio (16MB)', sample:'Artículo…', phy:'mediumtext' },
  { v:'longtext', l:'LONGTEXT', g:'Texto', icon:Text, color:'#7dd3fc', desc:'Texto enorme (4GB)', sample:'Log completo…', phy:'longtext' },
  { v:'integer', l:'BIGINT', g:'Número', icon:Hash, color:'#6366f1', desc:'Entero grande', sample:'12345', phy:'bigint unsigned' },
  { v:'int', l:'INT', g:'Número', icon:Hash, color:'#818cf8', desc:'Entero estándar', sample:'999', phy:'int' },
  { v:'smallint', l:'SMALLINT', g:'Número', icon:Hash, color:'#a5b4fc', desc:'Entero pequeño', sample:'50', phy:'smallint' },
  { v:'decimal', l:'DECIMAL', g:'Número', icon:Hash, color:'#f59e0b', desc:'Decimal (15,2)', sample:'99.99', phy:'decimal(15,2)' },
  { v:'float', l:'FLOAT', g:'Número', icon:Hash, color:'#fbbf24', desc:'Decimal flotante', sample:'3.14', phy:'float' },
  { v:'double', l:'DOUBLE', g:'Número', icon:Hash, color:'#fcd34d', desc:'Decimal doble precisión', sample:'1.23456789', phy:'double' },
  { v:'boolean', l:'TINYINT(1)', g:'Booleano', icon:CheckCircle, color:'#10b981', desc:'Verdadero / Falso', sample:'1 / 0', phy:'tinyint(1)' },
  { v:'date', l:'DATE', g:'Fecha', icon:Calendar, color:'#ec4899', desc:'Fecha sin hora', sample:'2026-09-09', phy:'date' },
  { v:'datetime', l:'DATETIME', g:'Fecha', icon:Clock, color:'#f472b6', desc:'Fecha y hora', sample:'2026-09-09 14:30', phy:'datetime' },
  { v:'timestamp', l:'TIMESTAMP', g:'Fecha', icon:Clock, color:'#fb7185', desc:'Timestamp Unix', sample:'auto now', phy:'timestamp' },
  { v:'time', l:'TIME', g:'Fecha', icon:Clock, color:'#fda4af', desc:'Solo hora', sample:'14:30:00', phy:'time' },
  { v:'year', l:'YEAR', g:'Fecha', icon:Calendar, color:'#e879f9', desc:'Solo año', sample:'2026', phy:'year' },
  { v:'email', l:'VARCHAR', g:'Especial', icon:Mail, color:'#8b5cf6', desc:'Email (validación)', sample:'user@x.com', phy:'varchar(255)' },
  { v:'phone', l:'VARCHAR', g:'Especial', icon:Phone, color:'#14b8a6', desc:'Teléfono', sample:'+52 123', phy:'varchar(30)' },
  { v:'url', l:'VARCHAR', g:'Especial', icon:Link, color:'#3b82f6', desc:'URL / Enlace', sample:'https://…', phy:'varchar(500)' },
  { v:'json', l:'JSON', g:'Especial', icon:Braces, color:'#f97316', desc:'JSON estructurado', sample:'{"k":"v"}', phy:'json' },
  { v:'uuid', l:'CHAR(36)', g:'Especial', icon:Key, color:'#6366f1', desc:'UUID v4', sample:'550e8400…', phy:'char(36)' },
  { v:'binary', l:'BLOB', g:'Especial', icon:Database, color:'#64748b', desc:'Datos binarios', sample:' archivo…', phy:'blob' },
  { v:'enum', l:'ENUM', g:'Especial', icon:AlertTriangle, color:'#eab308', desc:'Valor fijo de lista', sample:'a, b, c', phy:"enum('a','b','c')" },
  { v:'relation', l:'FK →', g:'Relación', icon:Link, color:'#4f46e5', desc:'Llave foránea', sample:'→ tabla.id', phy:'bigint unsigned' },
];

/** phpMyAdmin-class explorer: overview, structure, browse, SQL console, ER diagram. */
export function SchemaExplorer({ onChanged}:{onChanged?:()=>void}) {
  const [tables,setTables] = useState<SchemaTable[]>([]);
  const [overview,setOverview] = useState<DbOverviewTable[]>([]);
  const [database,setDatabase] = useState('');
  const [selected,setSelected] = useState<string|null>(null);
  const [detail,setDetail] = useState<SchemaTableDetail|null>(null);
  const [relations,setRelations] = useState<SchemaRelationModule[]>([]);
  const [tab,setTab] = useState<'dashboard'|'structure'|'browse'|'sql'|'audit'|'relations'>('dashboard');
  const [filter,setFilter] = useState('');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [showCreate,setShowCreate] = useState(false);

  async function load(keepSelection=false){
    setLoading(true); setError('');
    try{
      const [res, ov, rel] = await Promise.all([api.schemaTables(), api.dbOverview(), api.schemaRelations()]);
      setTables(res.tables); setOverview(ov.tables); setDatabase(ov.database); setRelations(rel.modules);
      setSelected(cur=>{
        if(keepSelection&&cur&&res.tables.some(t=>t.name===cur)) return cur;
        return res.tables.find(t=>t.managed)?.name??res.tables[0]?.name??null;
      });
      onChanged?.();
    }catch(err){ setError((err as Error).message); }finally{ setLoading(false); }
  }
  useEffect(()=>{void load();},[]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{ if(selected){ setDetail(null); void api.schemaTable(selected).then(setDetail).catch(e=>setError((e as Error).message)); } },[selected]);

  const visible = useMemo(()=>tables.filter(t=>t.name.toLowerCase().includes(filter.toLowerCase())),[tables,filter]);
  const stats = useMemo(()=>{ const map=new Map<string,DbOverviewTable>(); overview.forEach(o=>map.set(o.name,o)); return map; },[overview]);

  async function refreshDetail(){ if(selected){ setDetail(await api.schemaTable(selected)); } await load(true); }

  function openTable(name:string, nextTab:typeof tab='browse'){
    setSelected(name);
    setTab(nextTab);
  }

  const selectedTable = tables.find(t=>t.name===selected);
  const selectedStats = selected ? stats.get(selected) : undefined;
  const tableTabs = new Set<typeof tab>(['browse','structure']);

  return <div className="database-workbench">
    <header className="db-commandbar">
      <div className="db-identity"><span className="db-icon"><Database size={20}/></span><div><span>Base de datos activa</span><h1>{database||'Base de datos'}</h1></div><span className="db-online"><i/>MySQL conectado</span></div>
      <div className="db-command-actions"><span className="db-count"><b>{tables.length}</b> tablas</span><button className="button ghost" onClick={()=>void load(true)}><RefreshCw size={15}/>Actualizar</button><button className="button primary" onClick={()=>setShowCreate(true)}><Plus size={16}/>Nueva tabla</button></div>
    </header>

    <div className="explorer">
    <aside className="panel explorer-list" aria-label="Explorador de tablas">
      <div className="object-explorer-head">
        <div><span>Objetos de base de datos</span><h2>Tablas</h2></div>
        <span className="object-count">{visible.length}</span>
      </div>
      <label className="search inside"><Search size={15}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrar tablas…"/></label>
      <div className="explorer-tables">
        {visible.map(t=>{ const o=stats.get(t.name); return <button key={t.name} className={selected===t.name?'active':''} onClick={()=>openTable(t.name)}>
          <span className="table-object-icon"><Table2 size={16}/></span><span className="table-object-copy"><strong>{t.app_label||t.name.replace(/^nx_/, '')}</strong><code>{t.name}</code><small>{o?.rows??'—'} filas · {o?.engine??'MySQL'} · {o?.size_kb??'—'} KB</small></span>
          <ChevronRight className="table-object-arrow" size={16}/>
        </button>; })}
        {!visible.length&&<div className="object-empty"><Search size={18}/><span>No hay tablas que coincidan.</span></div>}
      </div>
      <div className="explorer-foot"><span><i/>Prefijo protegido</span><code>nx_</code></div>
    </aside>

    <section className="explorer-main">
      <div className="db-context-card">
        {selected?<><div className="selected-table-title"><span className="selected-table-icon"><Table2 size={20}/></span><div><span>Tabla seleccionada</span><h2>{selectedTable?.app_label||selected.replace(/^nx_/,'')}</h2><code>{selected}</code></div></div><div className="selected-table-stats"><span><b>{selectedStats?.rows??'—'}</b>registros</span><span><b>{detail?.columns.length??'—'}</b>columnas</span><span><b>{selectedStats?.size_kb??'—'} KB</b>tamaño</span></div></>:<div className="selected-table-title"><span className="selected-table-icon"><Database size={20}/></span><div><span>Vista general</span><h2>{database}</h2></div></div>}
      </div>
      <nav className="explorer-tabs top" aria-label="Vistas de base de datos">
        {[['dashboard','Inicio',Database],['browse','Datos',Table2],['structure','Estructura',Braces],['relations','Relaciones',GitBranch],['sql','SQL',Play],['audit','Actividad',HistoryIcon]].map(([k,l,Icon])=>{ const I=Icon as typeof Braces; const needsTable=tableTabs.has(k as typeof tab); return <button key={k as string} className={tab===k?'active':''} disabled={needsTable&&!selected} onClick={()=>setTab(k as typeof tab)}><I size={15}/>{l as string}</button>; })}
      </nav>
      {loading&&!tables.length?<div className="center-state small"><LoaderCircle className="spin"/><p>Leyendo el esquema…</p></div>:
       error?<div className="error-box">{error}<button className="button ghost" onClick={()=>void load(true)}>Reintentar</button></div>:
       tab==='dashboard'?<DbDashboard onOpenTable={name=>openTable(name,'browse')}/>:
       tab==='audit'?<AuditTab/>:
       tab==='structure'&&(selected&&detail)?<StructureTab detail={detail} stats={stats.get(selected)} onRefresh={refreshDetail} onTableChanged={async next=>{await load(false);if(next)setSelected(next);}}/>:
       tab==='browse'&&selected?<BrowseTab table={selected} columns={detail?.columns??[]} onChanged={refreshDetail}/>:
       tab==='sql'?<SqlTab/>:
        tab==='relations'?<RelationsGraph relations={relations} tables={tables}/>:
       <div className="center-state small"><Database/><p>Selecciona una tabla.</p></div>}
    </section>
    </div>
    {showCreate&&<CreateTableModal onClose={()=>setShowCreate(false)} onCreated={async t=>{setShowCreate(false);await load(true);setSelected(t);setTab('structure');}}/>}
  </div>;
}

/* ================= Structure tab: columns DDL + indexes + table actions ================= */
function StructureTab({detail,stats,onRefresh,onTableChanged}:{detail:SchemaTableDetail;stats?:DbOverviewTable;onRefresh:()=>Promise<void>;onTableChanged:(next?:string)=>Promise<void>}){
  const [colModal,setColModal] = useState<{mode:'add'|'edit';column?:SchemaColumn}|null>(null);
  const [idxModal,setIdxModal] = useState(false);
  const [busy,setBusy] = useState(false);
  const [allTables,setAllTables] = useState<string[]>([]);

  useEffect(()=>{ api.schemaTables().then(r=>setAllTables(r.tables.map(t=>t.name))).catch(()=>{}); },[]);

  async function dropColumn(name:string){ if(!confirm(`¿Eliminar la columna "${name}"? Los datos se perderán.`))return; setBusy(true);
    try{ await api.dropDbColumn(detail.table,name); await onRefresh(); }finally{ setBusy(false); } }
  async function dropForeignKey(column:string){ if(!confirm(`¿Eliminar la FK de la columna "${column}"?`))return; setBusy(true);
    try{ await api.dropForeignKey(detail.table,column); await onRefresh(); }finally{ setBusy(false); } }
  async function linkForeignKey(column:string){ 
    const fkTable=prompt(`Tabla referenciada para ${column}:`,allTables.find(t=>t!==detail.table));
    if(!fkTable?.trim())return; setBusy(true);
    try{ await api.addForeignKey(detail.table,{column,referenced_table:fkTable.trim()}); await onRefresh(); }finally{ setBusy(false); } }
  async function dropIndex(name:string){ if(!confirm(`¿Eliminar el índice "${name}"?`))return; setBusy(true);
    try{ await api.dropDbIndex(detail.table,name); await onRefresh(); }finally{ setBusy(false); } }
  async function renameTable(){ const n=prompt('Nuevo nombre de la tabla:',detail.table.replace(/^nx_/,'')); if(!n?.trim())return; setBusy(true);
    try{ const r=await api.renameDbTable(detail.table,n.trim()); alert(`Tabla renombrada a ${r.table}.`); await onTableChanged(r.table); }finally{ setBusy(false); } }
  async function truncate(){ if(!confirm(`¿Vaciar TODOS los registros de ${detail.table}? (La estructura se conserva)`))return; setBusy(true);
    try{ await api.truncateDbTable(detail.table); await onRefresh(); }finally{ setBusy(false); } }
  async function dropTable(){ if(!confirm(`¿ELIMINAR la tabla ${detail.table} con todos sus datos? Esta acción es irreversible.`))return;
    if(prompt(`Escribe ELIMINAR para confirmar:`)!=='ELIMINAR')return; setBusy(true);
    try{ await api.dropDbTable(detail.table); await onTableChanged(); }finally{ setBusy(false); } }

  return <div className="panel structure-panel">
    <div className="panel-head structure-toolbar">
      <div><span className="kicker"><Braces size={13}/>Diseño de tabla</span><h2>Columnas e índices</h2><p>Define los campos, llaves y reglas de esta tabla.</p></div>
      <div className="structure-meta">
        {stats&&<span className="engine-badge">{stats.engine}</span>}
        <button className="button ghost compact-button" onClick={()=>setIdxModal(true)}><Sigma size={15}/>Nuevo índice</button>
        <button className="button primary compact-button" onClick={()=>setColModal({mode:'add'})}><Plus size={15}/>Nueva columna</button>
        <details className="action-menu"><summary>Más acciones</summary><div><button onClick={()=>void renameTable()}><Pencil size={14}/>Renombrar tabla</button><button onClick={()=>void truncate()}><Eraser size={14}/>Vaciar registros</button><button className="danger" onClick={()=>void dropTable()}><Trash2 size={14}/>Eliminar tabla</button></div></details>
      </div>
    </div>
    <div className="table-wrap"><table>
      <thead><tr><th>#</th><th>Columna</th><th>Tipo</th><th>Nulo</th><th>Llave</th><th>Default</th><th>Acciones</th></tr></thead>
      <tbody>
        <tr className="locked-row"><td>—</td><td><b>id</b></td><td><code>bigint unsigned</code></td><td>NO</td><td><span className="pill managed"><Key size={11}/>PK</span></td><td>—</td><td className="muted">sistema</td></tr>
        {detail.columns.filter(c=>c.name!=='id'&&c.name!=='created_at'&&c.name!=='updated_at').map((c,i)=>{
          const fk = detail.foreign_keys?.find(f=>f.column_name===c.name);
          return <tr key={c.name}>
          <td>{i+1}</td><td><b>{c.name}</b></td><td><code>{c.type}</code></td><td>{c.nullable?'SÍ':'NO'}</td>
          <td>{fk?<span className="pill fk-badge"><Link size={11}/>FK → {fk.referenced_table_name}.{fk.referenced_column_name}</span>:c.key==='UNI'?<span className="pill managed">Única</span>:c.key==='MUL'?<span className="pill raw">IDX</span>:'—'}</td>
          <td>{c.default??'—'}</td>
          <td><div className="row-actions"><button title="Modificar" onClick={()=>setColModal({mode:'edit',column:c})}><Pencil size={14}/></button>{fk&&<button className="danger" title="Eliminar FK" disabled={busy} onClick={()=>void dropForeignKey(c.name)}><Unlink size={14}/></button>}<button className="danger" title="Eliminar" disabled={busy} onClick={()=>void dropColumn(c.name)}><Trash2 size={14}/></button></div></td>
        </tr>;})}
      </tbody>
    </table></div>
    <div className="index-box"><span className="kicker">Índices</span>
      {detail.indexes.map(ix=><div key={ix.name} className="index-row">
        <span className={`pill ${ix.name==='PRIMARY'?'managed':ix.unique?'managed':'raw'}`}>{ix.name==='PRIMARY'?'PRIMARY':ix.unique?'UNIQUE':'INDEX'}</span>
        <b>{ix.name}</b><small>({ix.columns.join(', ')})</small>
        {ix.name!=='PRIMARY'&&<button className="row-delete" onClick={()=>void dropIndex(ix.name)}><Trash2 size={13}/></button>}
      </div>)}
    </div>
    {colModal&&<ColumnModal table={detail.table} mode={colModal.mode} column={colModal.column} allTables={allTables} onClose={()=>setColModal(null)} onDone={async()=>{setColModal(null);await onRefresh();}}/>}
    {idxModal&&<IndexModal table={detail.table} columns={detail.columns} onClose={()=>setIdxModal(false)} onDone={async()=>{setIdxModal(false);await onRefresh();}}/>}
  </div>;
}

/* ================= Browse tab: paginated raw data ================= */
function BrowseTab({table,columns,onChanged}:{table:string;columns:SchemaColumn[];onChanged:()=>Promise<void>}){
  const [page,setPage] = useState<{data:Record<string,unknown>[];total:number;current_page:number;last_page:number}|null>(null);
  const [pn,setPn] = useState(1); const [search,setSearch] = useState(''); const [loading,setLoading] = useState(true);
  const [importResult,setImportResult] = useState<{inserted:number;errors:string[]}|null>(null);
  const [editing,setEditing] = useState<Record<string,unknown>|null|undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async()=>{ setLoading(true); try{ setPage(await api.browse(table,pn,search)); }finally{ setLoading(false); } },[table,pn,search]);
  useEffect(()=>{void load();},[load]);
  async function del(id:number){ if(!confirm(`¿Eliminar el registro #${id}?`))return; await api.deleteRow(table,id); await load(); await onChanged(); }
  const cols = columns.slice(0,12);

  async function doImport(file:File){ setLoading(true);
    try{ setImportResult(await api.importCsv(table,file)); await load(); await onChanged(); }catch(e){ setImportResult({inserted:0,errors:[(e as Error).message]}); }finally{ setLoading(false); } }

  return <div className="panel browse-panel">
    <div className="table-tools">
      <label className="search"><Search size={15}/><input value={search} onChange={e=>{setSearch(e.target.value);setPn(1);}} placeholder="Buscar en todas las columnas…"/></label>
      <div className="browse-actions">
        <span>{page?.total??0} registros</span>
        <button className="button primary compact-button" onClick={()=>setEditing(null)}><Plus size={15}/>Nuevo registro</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e=>{const f=e.target.files?.[0]; if(f) void doImport(f); e.target.value='';}}/>
        <button className="button ghost compact-button" onClick={()=>fileRef.current?.click()}><Upload size={15}/>Importar CSV</button>
        <details className="action-menu export-menu"><summary><Download size={14}/>Exportar</summary><div><button onClick={()=>void api.exportTable(table,'csv')}><Download size={14}/>Archivo CSV</button><button onClick={()=>void api.exportTable(table,'json')}><Braces size={14}/>Archivo JSON</button><button onClick={()=>void api.exportTable(table,'sql')}><Database size={14}/>Sentencias SQL</button></div></details>
      </div>
    </div>
    {importResult&&<div className={`callout ${importResult.errors.length?'admin-note':'ok-note'}`}>
      <div><strong>{importResult.inserted} registros importados</strong>
      {importResult.errors.length>0&&<p>{importResult.errors.slice(0,5).join(' · ')}{importResult.errors.length>5?` y ${importResult.errors.length-5} más…`:''}</p>}</div>
      <button className="icon-button" onClick={()=>setImportResult(null)} aria-label="Cerrar"><X size={14}/></button></div>}
    <div className="table-wrap"><table>
      <thead><tr><th>ID</th>{cols.filter(c=>c.name!=='id').map(c=><th key={c.name}>{c.name}<small>{c.type}</small></th>)}<th/></tr></thead>
      <tbody>{loading&&!page?<tr><td colSpan={cols.length+1} className="empty-cell"><LoaderCircle className="spin"/>Cargando…</td></tr>:
        page?.data.length?page.data.map(row=><tr key={String(row.id)}>
          <td><span className="record-id">#{String(row.id).padStart(3,'0')}</span></td>
          {cols.filter(c=>c.name!=='id').map(c=><td key={c.name}>{row[c.name]===null?'—':String(row[c.name])}</td>)}
          <td><div className="row-actions"><button title="Editar" onClick={()=>setEditing(row)}><Pencil size={13}/></button><button className="danger" title="Eliminar" onClick={()=>void del(Number(row.id))}><Trash2 size={13}/></button></div></td>
        </tr>):<tr><td colSpan={cols.length+1} className="empty-cell">Sin registros.</td></tr>}
      </tbody>
    </table></div>
    {page&&page.last_page>1&&<footer className="pagination"><span>Página {page.current_page} de {page.last_page}</span><div>
      <button disabled={page.current_page===1} onClick={()=>setPn(p=>p-1)}><ChevronLeft/></button><button disabled={page.current_page===page.last_page} onClick={()=>setPn(p=>p+1)}><ChevronRight/></button>
    </div></footer>}
    {editing!==undefined&&<RowModal table={table} columns={columns} row={editing} onClose={()=>setEditing(undefined)} onDone={async()=>{setEditing(undefined);await load();await onChanged();}}/>}
  </div>;
}

function RowModal({table,columns,row,onClose,onDone}:{table:string;columns:SchemaColumn[];row:Record<string,unknown>|null;onClose:()=>void;onDone:()=>Promise<void>}){
  const editable=columns.filter(c=>!['id','created_at','updated_at','deleted_at'].includes(c.name)&&!c.extra?.includes('auto_increment'));
  const [form,setForm]=useState<Record<string,unknown>>(()=>Object.fromEntries(editable.map(c=>[c.name,row?.[c.name]??c.default??''])));
  const [relations,setRelations]=useState<Record<string,RelationOption[]>>({});
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{void api.foreignKeys(table).then(async result=>{
    const pairs=await Promise.all(result.foreign_keys.map(async fk=>[fk.column_name,await api.relationOptions(table,fk.column_name)] as const));
    setRelations(Object.fromEntries(pairs));
  }).catch(()=>{});},[table]);
  function set(name:string,value:unknown){setForm(current=>({...current,[name]:value}));}
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{if(row)await api.updateRow(table,Number(row.id),form);else await api.createRow(table,form);await onDone();}catch(err){setError((err as Error).message);}finally{setBusy(false);}}
  return <ModalShell title={row?`Editar registro #${String(row.id)}`:`Nuevo registro en ${table}`} onClose={onClose} wide>
    <form className="modal-body" onSubmit={submit}><div className="record-editor-grid">{editable.map(c=>{
      const isBool=/^tinyint\(1\)/i.test(c.type); const isLong=/text|json/.test(c.type); const isDate=/^date$/.test(c.type); const isDateTime=/datetime|timestamp/.test(c.type); const isNumber=/int|decimal|double|float/.test(c.type);
      return <label className={`control ${isLong?'span-two':''}`} key={c.name}><span>{c.name}{!c.nullable&&c.default===null?<b> *</b>:null}</span>
        {relations[c.name]?<select value={String(form[c.name]??'')} onChange={e=>set(c.name,e.target.value)} required={!c.nullable}><option value="">{c.nullable?'Sin relación':'Seleccionar…'}</option>{relations[c.name].map(option=><option key={String(option.id)} value={option.id}>{option.label} · #{option.id}</option>)}</select>:
         isBool?<select value={form[c.name]?"1":"0"} onChange={e=>set(c.name,e.target.value==='1'?1:0)}><option value="1">Sí</option><option value="0">No</option></select>:
         isLong?<textarea rows={4} value={String(form[c.name]??'')} onChange={e=>set(c.name,e.target.value)} placeholder={c.type.includes('json')?'{"clave":"valor"}':''}/>:
         <input type={isDate?'date':isDateTime?'datetime-local':isNumber?'number':c.name.toLowerCase().includes('password')?'password':'text'} step={/decimal|double|float/.test(c.type)?'any':undefined} value={String(form[c.name]??'')} onChange={e=>set(c.name,e.target.value)} required={!c.nullable&&c.default===null}/>}<small>{c.type}{c.nullable?' · acepta null':''}</small></label>;
    })}</div>{error&&<p className="error-box">{error}</p>}<div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={15}/>:null}{row?'Guardar cambios':'Crear registro'}</button></div></form>
  </ModalShell>;
}

/* ================= SQL console with autocomplete ================= */
function SqlTab(){
  const [sql,setSql] = useState('SELECT TABLE_NAME, TABLE_ROWS, ROUND((DATA_LENGTH+INDEX_LENGTH)/1024,1) AS size_kb\nFROM information_schema.TABLES\nWHERE TABLE_SCHEMA = DATABASE()');
  const [result,setResult] = useState<{columns:string[];rows:Record<string,unknown>[];count:number;elapsed_ms:number}|null>(null);
  const [error,setError] = useState(''); const [running,setRunning] = useState(false);
  const [suggestions,setSuggestions] = useState<string[]>([]);
  const [showSug,setShowSug] = useState(false);
  const [sugIdx,setSugIdx] = useState(0);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const tablesRef = useRef<string[]>([]);

  useEffect(()=>{ api.schemaTables().then(r=>{ tablesRef.current=r.tables.map(t=>t.name); }).catch(()=>{}); },[]);

  const SQL_KEYWORDS = ['SELECT','FROM','WHERE','AND','OR','JOIN','LEFT','RIGHT','INNER','ON','GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','SHOW','TABLES','DESCRIBE','EXPLAIN','DISTINCT','AS','IN','NOT','NULL','IS','LIKE','BETWEEN','EXISTS','COUNT','SUM','AVG','MIN','MAX','ROUND','ASC','DESC','INNER JOIN','LEFT JOIN','RIGHT JOIN','CROSS JOIN','UNION','ALL'];

  function getSuggestions(word:string){
    if(!word||word.length<1) return[];
    const upper=word.toUpperCase();
    const kw=SQL_KEYWORDS.filter(k=>k.startsWith(upper)&&k!==word);
    const tbl=tablesRef.current.filter(t=>t.toLowerCase().startsWith(word.toLowerCase()));
    return[...kw,...tbl].slice(0,12);
  }

  function handleInput(e:React.ChangeEvent<HTMLTextAreaElement>){
    const val=e.target.value; setSql(val);
    const pos=e.target.selectionStart;
    const before=val.slice(0,pos);
    const match=before.match(/([a-zA-Z_]\w*)$/);
    if(match){
      const sg=getSuggestions(match[1]);
      setSuggestions(sg); setShowSug(sg.length>0); setSugIdx(0);
    }else{ setShowSug(false); }
  }

  function insertSuggestion(sug:string){
    const el=editorRef.current; if(!el) return;
    const pos=el.selectionStart;
    const before=sql.slice(0,pos);
    const after=sql.slice(pos);
    const match=before.match(/([a-zA-Z_]\w*)$/);
    if(match){
      const start=pos-match[1].length;
      const newSql=sql.slice(0,start)+sug+after;
      setSql(newSql); setShowSug(false);
      setTimeout(()=>{el.selectionStart=el.selectionEnd=start+sug.length;el.focus();},0);
    }
  }

  function handleKeyDown(e:React.KeyboardEvent<HTMLTextAreaElement>){
    if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();void run();return;}
    if(!showSug) return;
    if(e.key==='ArrowDown'){e.preventDefault();setSugIdx(i=>Math.min(i+1,suggestions.length-1));}
    else if(e.key==='ArrowUp'){e.preventDefault();setSugIdx(i=>Math.max(i-1,0));}
    else if(e.key==='Tab'||e.key==='Enter'){
      if(showSug&&suggestions[sugIdx]){e.preventDefault();insertSuggestion(suggestions[sugIdx]);}
    }else if(e.key==='Escape'){ setShowSug(false); }
  }

  async function run(){ setRunning(true); setError(''); try{ setResult(await api.runSql(sql)); }catch(e){ setError((e as Error).message); setResult(null); }finally{ setRunning(false); } }

  return <div className="panel sql-panel">
    <div className="panel-head slim"><div><span className="kicker"><Play size={13}/>Consola</span><h2>SQL de sólo lectura</h2></div>
      <span className="pill raw"><AlertTriangle size={11}/>SELECT · SHOW · DESCRIBE · EXPLAIN</span></div>
    <div className="sql-editor-wrap">
      <div className="sql-editor-container">
        <textarea ref={editorRef} className="code-editor sql" value={sql} onChange={handleInput} onKeyDown={handleKeyDown} onBlur={()=>setTimeout(()=>setShowSug(false),150)} spellCheck={false} aria-label="Consulta SQL"/>
        {showSug&&suggestions.length>0&&<div className="sql-suggestions">
          {suggestions.map((s,i)=><button key={s} className={`sql-sug-item ${i===sugIdx?'active':''}`} onMouseDown={e=>{e.preventDefault();insertSuggestion(s);}}>
            {tablesRef.current.includes(s)?<Database size={12}/>:<Code2 size={12}/>}
            <span>{s}</span>
          </button>)}
        </div>}
      </div>
      <div className="sql-run"><button className="button primary" onClick={()=>void run()} disabled={running}>{running?<LoaderCircle className="spin" size={15}/>:<Play size={15}/>}Ejecutar (Ctrl+Enter)</button></div></div>
    {error&&<p className="error-box">{error}</p>}
    {result&&<div className="sql-results">
      <p className="sql-meta">{result.count} filas · {result.elapsed_ms} ms</p>
      <div className="table-wrap"><table>
        <thead><tr>{result.columns.map(c=><th key={c}>{c}</th>)}</tr></thead>
        <tbody>{result.rows.map((r,i)=><tr key={i}>{result.columns.map(c=><td key={c}>{r[c]===null?'—':String(r[c])}</td>)}</tr>)}</tbody>
      </table></div>
    </div>}
  </div>;
}

/* ================= Modals ================= */
function ColumnModal({table,mode,column,onClose,onDone,allTables}:{table:string;mode:'add'|'edit';column?:SchemaColumn;onClose:()=>void;onDone:()=>Promise<void>;allTables?:string[]}){
  const typeOf = (t:string)=>DDL_TYPES.find(d=>t.startsWith(d.v))?.v??'string';
  const [form,setForm] = useState({ name:column?.name??'', data_type:column?typeOf(column.type):'string', length:column&&column.type.includes('varchar')?parseInt(column.type.replace(/\D/g,''))||255:255,
    nullable:column?.nullable??true, default_value:column?.default??'', unique:false, unsigned:false, comment:'',
    fk_table:'', fk_column:'id', fk_on_delete:'SET NULL', enum_values:'' });
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const [tables,setTables] = useState<string[]>(allTables??[]);
  const [refColumns,setRefColumns] = useState<string[]>([]);

  useEffect(()=>{ if(!allTables) api.schemaTables().then(r=>setTables(r.tables.map(t=>t.name))).catch(()=>{}); },[]);

  useEffect(()=>{
    if(form.data_type==='relation'&&form.fk_table){
      api.schemaTable(form.fk_table).then(r=>setRefColumns(r.columns.map(c=>c.name))).catch(()=>setRefColumns([]));
    }
  },[form.fk_table,form.data_type]);

  async function submit(e:React.FormEvent){ e.preventDefault(); setBusy(true); setError('');
    try{
      if(mode==='add'){
        await api.addDbColumn(table,{...form});
        if(form.data_type==='relation'&&form.fk_table){
          await api.addForeignKey(table,{column:form.name,referenced_table:form.fk_table,referenced_column:form.fk_column,on_delete:form.fk_on_delete});
        }
      } else {
        await api.modifyDbColumn(table,column!.name,{data_type:form.data_type,length:['string','email','phone','url'].includes(form.data_type)?form.length:null,nullable:form.nullable,default_value:form.default_value||null,unique:form.unique,unsigned:form.unsigned,comment:form.comment||null});
      }
      await onDone();
    }catch(err){ setError((err as Error).message); }finally{ setBusy(false); } }

  const groups = DDL_TYPES.reduce<Record<string,typeof DDL_TYPES>>((acc,t)=>{(acc[t.g]=acc[t.g]||[]).push(t);return acc;},{});

  return <ModalShell title={mode==='add'?`Nueva columna en ${table}`:`Modificar ${column?.name}`} onClose={onClose}>
    <form className="modal-body" onSubmit={submit}>
      {mode==='add'&&<label className="control"><span>Nombre</span><input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="cliente_id" required/></label>}
      <div className="form-grid three">
        <label className="control"><span>Tipo</span><select value={form.data_type} onChange={e=>setForm({...form,data_type:e.target.value})}>
          {Object.entries(groups).map(([g,items])=><optgroup key={g} label={g}>{items.map(t=><option key={t.v} value={t.v}>{t.l} — {t.desc}</option>)}</optgroup>)}
        </select></label>
        {['string','email','phone','url'].includes(form.data_type)&&<label className="control"><span>Longitud</span><input type="number" min={1} max={65535} value={form.length} onChange={e=>setForm({...form,length:Number(e.target.value)})}/></label>}
        <label className="control"><span>Default</span><input value={form.default_value} onChange={e=>setForm({...form,default_value:e.target.value})} placeholder="—"/></label>
      </div>
      {form.data_type==='enum'&&<label className="control"><span>Valores (separados por coma)</span><input value={form.enum_values} onChange={e=>setForm({...form,enum_values:e.target.value})} placeholder="activo,inactivo,pendiente" required/></label>}
      {form.data_type==='relation'&&<div className="fk-config">
        <div className="fk-header"><Link size={14}/><strong>Configurar Foreign Key</strong></div>
        <div className="form-grid three">
          <label className="control"><span>Tabla referenciada</span>
            <select value={form.fk_table} onChange={e=>setForm({...form,fk_table:e.target.value,fk_column:'id'})} required>
              <option value="">Seleccionar tabla…</option>
              {tables.filter(t=>t!==table).map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="control"><span>Columna referenciada</span>
            <select value={form.fk_column} onChange={e=>setForm({...form,fk_column:e.target.value})} required>
              {refColumns.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="control"><span>Al eliminar</span>
            <select value={form.fk_on_delete} onChange={e=>setForm({...form,fk_on_delete:e.target.value})}>
              <option value="SET NULL">SET NULL</option>
              <option value="CASCADE">CASCADE</option>
              <option value="RESTRICT">RESTRICT</option>
              <option value="NO ACTION">NO ACTION</option>
            </select>
          </label>
        </div>
        {form.fk_table&&<div className="fk-preview"><small>VARCHAR → </small><code>{table}.{form.name}</code><small> → </small><code>{form.fk_table}.{form.fk_column}</code><small> ({form.fk_on_delete})</small></div>}
      </div>}
      <div className="toggle-row">
        <label className="check"><input type="checkbox" checked={form.nullable} onChange={e=>setForm({...form,nullable:e.target.checked})}/><span>Acepta nulos</span></label>
        {mode==='edit'&&<label className="check"><input type="checkbox" checked={form.unique} onChange={e=>setForm({...form,unique:e.target.checked})}/><span>Valor único</span></label>}
        {['integer','int','smallint'].includes(form.data_type)&&<label className="check"><input type="checkbox" checked={form.unsigned} onChange={e=>setForm({...form,unsigned:e.target.checked})}/><span>Unsigned</span></label>}
      </div>
      {mode==='edit'&&<label className="control"><span>Comentario</span><input value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} placeholder="Descripción de la columna"/></label>}
      {error&&<p className="error-box">{error}</p>}
      <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={15}/>:null}{mode==='add'?'Agregar columna':'Aplicar cambios'}</button></div>
    </form>
  </ModalShell>;
}

function IndexModal({table,columns,onClose,onDone}:{table:string;columns:SchemaColumn[];onClose:()=>void;onDone:()=>Promise<void>}){
  const [cols,setCols] = useState<string[]>([]); const [unique,setUnique] = useState(false); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  async function submit(e:React.FormEvent){ e.preventDefault(); setBusy(true); setError('');
    try{ await api.addDbIndex(table,{columns:cols,unique}); await onDone(); }catch(err){ setError((err as Error).message); }finally{ setBusy(false); } }
  return <ModalShell title={`Nuevo índice en ${table}`} onClose={onClose}>
    <form className="modal-body" onSubmit={submit}>
      <div className="control"><span>Columnas</span><div className="role-picks">{columns.filter(c=>c.name!=='id').map(c=>
        <label key={c.name} className="check"><input type="checkbox" checked={cols.includes(c.name)} onChange={e=>setCols(v=>e.target.checked?[...v,c.name]:v.filter(x=>x!==c.name))}/><span>{c.name}</span></label>)}</div></div>
      <label className="check"><input type="checkbox" checked={unique} onChange={e=>setUnique(e.target.checked)}/><span>Índice único (UNIQUE)</span></label>
      {error&&<p className="error-box">{error}</p>}
      <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy||!cols.length}>{busy?<LoaderCircle className="spin" size={15}/>:null}Crear índice</button></div>
    </form>
  </ModalShell>;
}

type ColDef = {name:string;data_type:string;length:number;nullable:boolean;unique:boolean;default_value:string;comment:string;fk_table:string;fk_column:string;fk_on_delete:string;unsigned:boolean;enum_values:string};
const makeEmptyCol = ():ColDef => ({name:'',data_type:'string',length:255,nullable:true,unique:false,default_value:'',comment:'',fk_table:'',fk_column:'id',fk_on_delete:'SET NULL',unsigned:false,enum_values:''});

/* ================= CreateTableModal — Super Professional ================= */
function CreateTableModal({onClose,onCreated}:{onClose:()=>void;onCreated:(table:string)=>Promise<void>}){
  const [name,setName] = useState('');
  const [cols,setCols] = useState<ColDef[]>([makeEmptyCol()]);
  const [opts,setOpts] = useState({timestamps:true,softDeletes:false,uuidPk:false,engine:'InnoDB',charset:'utf8mb4',collation:'utf8mb4_unicode_ci'});
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const [tables,setTables] = useState<string[]>([]);
  const [refColsMap,setRefColsMap] = useState<Record<string,string[]>>({});
  const [expandedRow,setExpandedRow] = useState<number|null>(null);
  const [activeTab,setActiveTab] = useState<'columns'|'options'|'review'>('columns');

  useEffect(()=>{ api.schemaTables().then(r=>setTables(r.tables.map(t=>t.name))).catch(()=>{}); },[]);

  useEffect(()=>{
    cols.forEach(c=>{
      if(c.data_type==='relation'&&c.fk_table&&!refColsMap[c.fk_table]){
        api.schemaTable(c.fk_table).then(r=>setRefColsMap(prev=>({...prev,[c.fk_table]:r.columns.map(col=>col.name)}))).catch(()=>{});
      }
    });
  },[cols]);

  function updateCol(i:number,patch:Partial<ColDef>){ setCols(v=>v.map((x,j)=>j===i?{...x,...patch}:x)); }
  function moveCol(i:number,dir:-1|1){ const j=i+dir; if(j<0||j>=cols.length)return; setCols(v=>{const a=[...v];[a[i],a[j]]=[a[j],a[i]];return a;}); }

  const quickFields = [
    {label:'Email',type:'email',icon:Mail,preset:{data_type:'email',length:255,nullable:false,unique:true}},
    {label:'Teléfono',type:'phone',icon:Phone,preset:{data_type:'phone',length:30,nullable:true}},
    {label:'URL',type:'url',icon:Link,preset:{data_type:'url',length:500,nullable:true}},
    {label:'Password',type:'string',icon:Key,preset:{data_type:'string',length:255,nullable:false,comment:'Hash de contraseña'}},
    {label:'Slug',type:'string',icon:Code2,preset:{data_type:'string',length:255,nullable:false,unique:true}},
    {label:'Estado',type:'enum',icon:AlertTriangle,preset:{data_type:'enum',nullable:false,default_value:'activo',enum_values:'activo,inactivo,pendiente'}},
    {label:'Precio',type:'decimal',icon:Hash,preset:{data_type:'decimal',length:255,nullable:false,default_value:'0.00'}},
    {label:'Cantidad',type:'integer',icon:Hash,preset:{data_type:'integer',nullable:false,default_value:'0'}},
    {label:'Activo',type:'boolean',icon:CheckCircle,preset:{data_type:'boolean',nullable:false,default_value:'1'}},
    {label:'Fecha',type:'date',icon:Calendar,preset:{data_type:'date',nullable:true}},
    {label:'UUID',type:'uuid',icon:Key,preset:{data_type:'uuid',length:36,nullable:false,unique:true}},
    {label:'JSON',type:'json',icon:Braces,preset:{data_type:'json',nullable:true}},
    {label:'FK →',type:'relation',icon:Link,preset:{data_type:'relation',nullable:true}},
  ];

  function addQuickField(qf:typeof quickFields[0]){
    const defaults:ColDef = {...makeEmptyCol(),name:qf.type==='email'?'email':qf.type==='phone'?'telefono':qf.type==='url'?'url':qf.type==='enum'?'estado':qf.label.toLowerCase(),...qf.preset};
    setCols(v=>[...v,defaults]);
  }

  function generatePreview():string{
    const tbl = name.trim()||'mi_tabla';
    let sql = `CREATE TABLE nx_${tbl} (\n  id bigint unsigned NOT NULL AUTO_INCREMENT`;
    if(opts.uuidPk) sql = `CREATE TABLE nx_${tbl} (\n  id char(36) NOT NULL`;
    cols.filter(c=>c.name.trim()).forEach(c=>{
      const typeDef = DDL_TYPES.find(t=>t.v===c.data_type);
      const physical = typeDef?.phy||'varchar(255)';
      const len = physical.includes(':length')?physical.replace(':length',String(c.length)):physical;
      const nullStr = c.nullable?'NULL':'NOT NULL';
      const defStr = c.default_value?` DEFAULT '${c.default_value}'`:'';
      const uniqueStr = c.unique?' UNIQUE':'';
      const unsignedStr = c.unsigned?' unsigned':'';
      sql += `,\n  ${c.name} ${len}${unsignedStr} ${nullStr}${defStr}${uniqueStr}`;
    });
    if(opts.timestamps) sql += `,\n  created_at timestamp NULL DEFAULT NULL,\n  updated_at timestamp NULL DEFAULT NULL`;
    if(opts.softDeletes) sql += `,\n  deleted_at timestamp NULL DEFAULT NULL`;
      sql += `,\n  PRIMARY KEY (id)\n) ENGINE=${opts.engine} DEFAULT CHARSET=${opts.charset} COLLATE=${opts.collation};`;
    cols.filter(c=>c.data_type==='relation'&&c.fk_table).forEach(c=>{
      sql += `\n\nALTER TABLE nx_${tbl} ADD CONSTRAINT fk_${tbl}_${c.name} FOREIGN KEY (${c.name}) REFERENCES ${c.fk_table}(${c.fk_column}) ON DELETE ${c.fk_on_delete};`;
    });
    return sql;
  }

  async function submit(e:React.FormEvent){ e.preventDefault(); setBusy(true); setError('');
    try{
      const valid = cols.filter(c=>c.name.trim());
      const normalCols = valid.filter(c=>c.data_type!=='relation').map(c=>({name:c.name,data_type:c.data_type,length:['string','email','phone','url'].includes(c.data_type)?c.length:undefined,nullable:c.nullable,unique:c.unique,default_value:c.default_value||undefined,unsigned:c.unsigned,comment:c.comment||undefined,enum_values:c.enum_values||undefined}));
      const r = await api.createDbTable({name,columns:normalCols,add_timestamps:opts.timestamps,add_soft_deletes:opts.softDeletes,use_uuid_pk:opts.uuidPk,engine:opts.engine,charset:opts.charset,collation:opts.collation});
      for(const c of valid.filter(c=>c.data_type==='relation'&&c.fk_table)){
        await api.addDbColumn(r.table,{name:c.name,data_type:'integer',nullable:c.nullable,unsigned:true});
        await api.addForeignKey(r.table,{column:c.name,referenced_table:c.fk_table,referenced_column:c.fk_column,on_delete:c.fk_on_delete});
      }
      await onCreated(r.table);
    }catch(err){ setError((err as Error).message); }finally{ setBusy(false); } }

  const groups = DDL_TYPES.reduce<Record<string,typeof DDL_TYPES>>((acc,t)=>{(acc[t.g]=acc[t.g]||[]).push(t);return acc;},{});
  const colCount = cols.filter(c=>c.name.trim()).length;
  const fkCount = cols.filter(c=>c.data_type==='relation'&&c.fk_table).length;
  const isReady = Boolean(name.trim()&&colCount&&cols.filter(c=>c.name.trim()).every(c=>c.data_type!=='relation'||c.fk_table));

  return <ModalShell title="Crear una tabla" onClose={onClose} wide>
    <form className="modal-body create-table-flow" onSubmit={submit}>
      <div className="ct-intro"><span className="ct-intro-icon"><Sparkles size={20}/></span><div><strong>Construye la estructura sin escribir SQL</strong><p>Empieza con los campos esenciales. Las opciones técnicas están disponibles en el siguiente paso.</p></div><span className="ct-safety"><CheckCircle size={14}/>Prefijo nx_ protegido</span></div>

      <div className="ct-header">
        <label className="control ct-name-control">
          <span>¿Qué información guardarás?</span>
          <div className="ct-name-wrap"><span>nx_</span><input autoFocus value={name} onChange={e=>setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="clientes" required className="table-name-input"/></div>
          <small>Usa un nombre plural y descriptivo, por ejemplo: productos, ordenes_compra.</small>
        </label>
      </div>

      <div className="ct-steps">
        <button type="button" className={activeTab==='columns'?'active':'done'} onClick={()=>setActiveTab('columns')}><span>{activeTab==='columns'?'1':<Check size={14}/>}</span><div><b>Campos</b><small>Define qué guardar</small></div></button>
        <i/>
        <button type="button" className={activeTab==='options'?'active':activeTab==='review'?'done':''} onClick={()=>setActiveTab('options')}><span>{activeTab==='review'?<Check size={14}/>:2}</span><div><b>Configuración</b><small>Ajustes opcionales</small></div></button>
        <i/>
        <button type="button" className={activeTab==='review'?'active':''} onClick={()=>setActiveTab('review')}><span>3</span><div><b>Revisión</b><small>Confirma y crea</small></div></button>
      </div>

      {activeTab==='columns'&&<>
        <div className="ct-quick-bar">
          <div className="ct-section-heading"><div><strong>Plantillas de campo</strong><small>Agrega configuraciones comunes con un clic</small></div></div>
          {quickFields.map(qf=><button key={qf.label} type="button" className="ct-quick-btn" onClick={()=>addQuickField(qf)} title={qf.label}><qf.icon size={12}/>{qf.label}</button>)}
        </div>

        <div className="ct-section-heading"><div><strong>Campos de la tabla</strong><small>Cada fila representa una columna en MySQL</small></div><div className="ct-legend"><span><b>NN</b> Obligatorio</span><span><b>UQ</b> Sin duplicados</span><span><b>UN</b> Solo positivos</span></div></div>
        <div className="ct-columns">
          <div className="ct-col-labels"><span/><span/><b>Nombre del campo</b><b>Tipo de dato</b><b>Long.</b><b>Reglas</b><span/></div>
          {cols.map((c,i)=>{
            const typeDef = DDL_TYPES.find(t=>t.v===c.data_type);
            const Icon = typeDef?.icon ?? Text;
            const isExpanded = expandedRow===i;
            const isFk = c.data_type==='relation';
            return <div key={i} className={`ct-col-card ${isFk?'ct-col-fk':''}`}>
              <div className="ct-col-row">
                <div className="ct-col-drag">
                  <button type="button" className="ct-drag-btn" onClick={()=>moveCol(i,-1)} disabled={i===0} title="Subir">▲</button>
                  <button type="button" className="ct-drag-btn" onClick={()=>moveCol(i,1)} disabled={i===cols.length-1} title="Bajar">▼</button>
                </div>
                <div className="ct-col-icon" style={{background:typeDef?.color+'15',color:typeDef?.color}}><Icon size={15}/></div>
                <input value={c.name} onChange={e=>updateCol(i,{name:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')})} placeholder={isFk?'cliente_id':'nombre_campo'} className="ct-col-name" required aria-label={`Nombre del campo ${i+1}`}/>
                <select value={c.data_type} onChange={e=>updateCol(i,{data_type:e.target.value})} className="ct-col-type">
                  {Object.entries(groups).map(([g,items])=><optgroup key={g} label={g}>{items.map(t=><option key={t.v} value={t.v}>{t.l} — {t.desc}</option>)}</optgroup>)}
                </select>
                {['string','email','phone','url'].includes(c.data_type)&&<input type="number" value={c.length} min={1} max={65535} onChange={e=>updateCol(i,{length:Number(e.target.value)})} className="ct-col-len" title="Longitud"/>}
                <div className="ct-col-toggles">
                  <button type="button" className={`ct-toggle ${!c.nullable?'on':''}`} onClick={()=>updateCol(i,{nullable:!c.nullable})} title={c.nullable?'Nullable':'NOT NULL'}>{c.nullable?'N':'NN'}</button>
                  <button type="button" className={`ct-toggle ${c.unique?'on':''}`} onClick={()=>updateCol(i,{unique:!c.unique})} title="Unique">UQ</button>
                  {c.data_type==='integer'&&<button type="button" className={`ct-toggle ${c.unsigned?'on':''}`} onClick={()=>updateCol(i,{unsigned:!c.unsigned})} title="Unsigned">UN</button>}
                </div>
                <button type="button" className="ct-col-expand" onClick={()=>setExpandedRow(isExpanded?null:i)} title="Configuración avanzada"><Pencil size={13}/></button>
                <button type="button" className="ct-col-del" onClick={()=>setCols(v=>v.filter((_,j)=>j!==i))} disabled={cols.length===1} title="Eliminar"><X size={14}/></button>
              </div>

              {isFk&&<div className="ct-col-fk-config">
                <Link size={13} style={{color:'#4f46e5',flexShrink:0}}/>
                <select value={c.fk_table} onChange={e=>updateCol(i,{fk_table:e.target.value,fk_column:'id'})} className="ct-fk-sel" required>
                  <option value="">Seleccionar tabla…</option>
                  {tables.filter(t=>t!==name).map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                {c.fk_table&&<span className="ct-fk-arrow">→</span>}
                {c.fk_table&&<select value={c.fk_column} onChange={e=>updateCol(i,{fk_column:e.target.value})} className="ct-fk-col-sel">
                  {(refColsMap[c.fk_table]??['id']).map(col=><option key={col} value={col}>{col}</option>)}
                </select>}
                {c.fk_table&&<select value={c.fk_on_delete} onChange={e=>updateCol(i,{fk_on_delete:e.target.value})} className="ct-fk-action">
                  <option value="SET NULL">ON DELETE SET NULL</option>
                  <option value="CASCADE">ON DELETE CASCADE</option>
                  <option value="RESTRICT">ON DELETE RESTRICT</option>
                  <option value="NO ACTION">ON DELETE NO ACTION</option>
                </select>}
                {c.fk_table&&<span className="ct-fk-badge">FK</span>}
              </div>}

              {isExpanded&&!isFk&&<div className="ct-col-advanced">
                <label className="control"><span>Default</span><input value={c.default_value} onChange={e=>updateCol(i,{default_value:e.target.value})} placeholder="NULL"/></label>
                {c.data_type==='enum'&&<label className="control"><span>Valores (separados por coma)</span><input value={c.enum_values} onChange={e=>updateCol(i,{enum_values:e.target.value})} placeholder="activo,inactivo,pendiente" required/></label>}
                <label className="control"><span>Comentario</span><input value={c.comment} onChange={e=>updateCol(i,{comment:e.target.value})} placeholder="Descripción de la columna"/></label>
              </div>}
            </div>;
          })}
          <button type="button" className="ct-add-col" onClick={()=>setCols(v=>[...v,makeEmptyCol()])}><Plus size={15}/>Agregar columna vacía</button>
        </div>
      </>}

      {activeTab==='options'&&<><div className="ct-step-copy"><strong>Configuración de la tabla</strong><p>Los valores recomendados ya están seleccionados. Solo cámbialos si tu proyecto lo necesita.</p></div><div className="ct-options-panel">
        <div className="ct-opt-group">
          <h4><Calendar size={14}/>Timestamps</h4>
          <label className="ct-opt-row"><input type="checkbox" checked={opts.timestamps} onChange={e=>setOpts({...opts,timestamps:e.target.checked})}/><div><b>created_at / updated_at</b><small>Columnas de auditoría automática</small></div></label>
          <label className="ct-opt-row"><input type="checkbox" checked={opts.softDeletes} onChange={e=>setOpts({...opts,softDeletes:e.target.checked})}/><div><b>deleted_at</b><small>Soft delete (no elimina registros físicamente)</small></div></label>
        </div>
        <div className="ct-opt-group">
          <h4><Key size={14}/>Primary Key</h4>
          <label className="ct-opt-row"><input type="checkbox" checked={opts.uuidPk} onChange={e=>setOpts({...opts,uuidPk:e.target.checked})}/><div><b>UUID como PK</b><small>En vez de auto-incremental, usa CHAR(36)</small></div></label>
        </div>
        <div className="ct-opt-group">
          <h4><Database size={14}/>Motor y Charset</h4>
          <div className="form-grid three">
            <label className="control"><span>Motor</span><select value={opts.engine} onChange={e=>setOpts({...opts,engine:e.target.value})}><option>InnoDB</option><option>MyISAM</option></select></label>
            <label className="control"><span>Charset</span><select value={opts.charset} onChange={e=>setOpts({...opts,charset:e.target.value})}><option>utf8mb4</option><option>utf8</option><option>latin1</option><option>ascii</option></select></label>
            <label className="control"><span>Collation</span><select value={opts.collation} onChange={e=>setOpts({...opts,collation:e.target.value})}><option>utf8mb4_unicode_ci</option><option>utf8mb4_general_ci</option><option>utf8mb4_bin</option><option>utf8_general_ci</option></select></label>
          </div>
        </div>
        <div className="ct-opt-group">
          <h4><Table2 size={14}/>Resumen</h4>
          <div className="ct-summary">
            <div className="ct-sum-item"><span className="ct-sum-num">{colCount}</span><span>Columnas</span></div>
            <div className="ct-sum-item"><span className="ct-sum-num">{fkCount}</span><span>Foreign Keys</span></div>
            <div className="ct-sum-item"><span className="ct-sum-num">{opts.timestamps?2:0}</span><span>Timestamps</span></div>
            <div className="ct-sum-item"><span className="ct-sum-num">{opts.softDeletes?1:0}</span><span>Soft Delete</span></div>
          </div>
        </div>
      </div></>}

      {activeTab==='review'&&<div className="ct-review">
        <div className="ct-review-card"><span className="ct-review-icon"><Table2 size={20}/></span><div><span>Se creará</span><strong>nx_{name||'nombre_tabla'}</strong><small>{colCount} campos personalizados · {opts.uuidPk?'UUID':'ID autoincremental'} · {opts.engine}</small></div><span className={`ct-ready ${isReady?'ok':''}`}>{isReady?<><CheckCircle size={14}/>Lista para crear</>:<><AlertTriangle size={14}/>Faltan datos</>}</span></div>
        <div className="ct-review-grid">
          <div><span>Campos</span><b>{colCount}</b><small>{fkCount} relaciones</small></div>
          <div><span>Auditoría</span><b>{opts.timestamps?'Activada':'Desactivada'}</b><small>created_at y updated_at</small></div>
          <div><span>Borrado seguro</span><b>{opts.softDeletes?'Activado':'Desactivado'}</b><small>Columna deleted_at</small></div>
        </div>
        <details className="ct-sql-preview"><summary><Code2 size={14}/><strong>Ver SQL que se ejecutará</strong><small>Para usuarios avanzados</small></summary><div className="ct-sql-header"><span>Vista previa de solo lectura</span><button type="button" className="button ghost" onClick={()=>navigator.clipboard.writeText(generatePreview())}>Copiar SQL</button></div><pre><code>{generatePreview()}</code></pre></details>
      </div>}

      {error&&<p className="error-box">{error}</p>}
      <div className="modal-actions">
        <div className="ct-final-summary">
          <span>Paso {activeTab==='columns'?1:activeTab==='options'?2:3} de 3</span>
          <small>{activeTab==='columns'?'Define los campos principales':activeTab==='options'?'Revisa los ajustes técnicos':'Confirma antes de crear'}</small>
        </div>
        <div className="modal-actions-right">
          {activeTab==='columns'?<button type="button" className="button ghost" onClick={onClose}>Cancelar</button>:<button type="button" className="button ghost" onClick={()=>setActiveTab(activeTab==='review'?'options':'columns')}><ChevronLeft size={15}/>Anterior</button>}
          {activeTab!=='review'?<button type="button" className="button primary" disabled={!name.trim()||!colCount} onClick={()=>setActiveTab(activeTab==='columns'?'options':'review')}>Continuar<ArrowRight size={15}/></button>:<button className="button primary" disabled={busy||!isReady}>{busy?<LoaderCircle className="spin" size={15}/>:<CheckCircle size={15}/>}Crear tabla</button>}
        </div>
      </div>
    </form>
  </ModalShell>;
}

function ModalShell({title,children,onClose,wide=false}:{title:string;children:React.ReactNode;onClose:()=>void;wide?:boolean}){
  useEffect(()=>{ const handler=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();}; document.addEventListener('keydown',handler); return()=>document.removeEventListener('keydown',handler); },[onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <section className={`modal ${wide?'modal-wide':''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header><div><span className="kicker">NexoDB Studio</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20}/></button></header>
      {children}
    </section>
  </div>;
}

/* ================= ER Diagram — Full Schema Visualization ================= */
const TYPE_COLORS:Record<string,string> = {
  'bigint unsigned':'#6366f1','bigint':'#6366f1','int':'#6366f1','int unsigned':'#6366f1',
  'varchar':'#0ea5e9','text':'#0ea5e9','mediumtext':'#0ea5e9','longtext':'#0ea5e9',
  'decimal':'#f59e0b','double':'#f59e0b','float':'#f59e0b',
  'tinyint':'#10b981','boolean':'#10b981',
  'date':'#ec4899','datetime':'#ec4899','timestamp':'#ec4899','time':'#ec4899',
};
const TYPE_ICONS:Record<string,string> = { PK:'🔑', FK:'🔗', UQ:'⭐', IDX:'📇' };

function RelationsGraph({relations,tables}:{relations:SchemaRelationModule[];tables:SchemaTable[]}){
  const [details,setDetails] = useState<Record<string,SchemaTableDetail>>({});
  const [loadingDetail,setLoadingDetail] = useState(true);
  const [hoveredTable,setHoveredTable] = useState<string|null>(null);
  const [hoveredEdge,setHoveredEdge] = useState<number|null>(null);

  useEffect(()=>{
    setLoadingDetail(true);
    Promise.all(tables.map(async t=>{ try{return [t.name,await api.schemaTable(t.name)] as const;}catch{return null;} }))
      .then(results=>{ const map:Record<string,SchemaTableDetail>={}; results.forEach(r=>{if(r)map[r[0]]=r[1];}); setDetails(map); setLoadingDetail(false); });
  },[tables]);

  const edges = useMemo(()=>relations.flatMap(m=>m.relations.filter(r=>r.target_table).map(r=>({
    from:m.table, to:r.target_table!, column:r.column,
    fromLabel:m.name, toLabel:relations.find(x=>x.table===r.target_table)?.name??r.target_table!
  }))),[relations]);

  const managedTables = useMemo(()=>tables.filter(t=>t.managed),[tables]);
  const displayTables = managedTables.length?managedTables:tables;

  const nodeW=220, rowH=22, headerH=44, padX=50, padY=40, gapX=80, gapY=60;
  const getNodeH=(name:string)=>{
    const d=details[name];
    const cols=d?d.columns.filter(c=>c.name!=='created_at'&&c.name!=='updated_at').length:3;
    return headerH+Math.max(cols,2)*rowH+16;
  };

  const cols = Math.min(Math.ceil(Math.sqrt(displayTables.length||1)),3);
  const positions = useMemo(()=>{
    const pos:Record<string,{x:number;y:number;h:number}>={};
    let curX=padX, curY=padY, maxH=0;
    displayTables.forEach((t,i)=>{
      const h=getNodeH(t.name);
      if(i%cols===0&&i>0){curX=padX;curY+=maxH+gapY;maxH=0;}
      pos[t.name]={x:curX,y:curY,h};
      curX+=nodeW+gapX;
      maxH=Math.max(maxH,h);
    });
    return pos;
  },[displayTables,details]);

  const svgW = cols*nodeW+(cols-1)*gapX+padX*2;
  const lastRow = Object.values(positions).reduce((m,p)=>Math.max(m,p.y+p.h),0);
  const svgH = lastRow+padY+40;

  const nodeCenter=(name:string)=>{const p=positions[name];if(!p)return{x:0,y:0};return{x:p.x+nodeW/2,y:p.y+p.h/2};};

  function shortenType(t:string){ return t.replace('unsigned','').replace('int','Int').replace('varchar','Str').slice(0,12); }

  if(loadingDetail) return <div className="panel"><div className="center-state small"><LoaderCircle className="spin"/><p>Cargando esquema completo…</p></div></div>;

  return <div className="panel er-panel-full">
    <div className="panel-head slim"><div><span className="kicker"><GitBranch size={13}/>Diagrama ER</span><h2>{displayTables.length} tablas · {edges.length} relaciones</h2></div></div>
    {displayTables.length===0?<p className="empty-cell">No hay tablas para mostrar.</p>:
    <>
    <div className="er-scroll">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="er-svg-full">
        <defs>
          <marker id="arrow" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="9" markerHeight="9" orient="auto"><path d="M0 1 L12 6 L0 11z" fill="#a78bfa"/></marker>
          <marker id="arrowHover" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="9" markerHeight="9" orient="auto"><path d="M0 1 L12 6 L0 11z" fill="#6d5dfc"/></marker>
          <filter id="cardShadow"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#6366f1" flood-opacity=".1"/></filter>
          <filter id="cardShadowHover"><feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#6366f1" flood-opacity=".2"/></filter>
          <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient>
          <linearGradient id="edgeLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#c4b5fd"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient>
        </defs>

        {/* Edges */}
        {edges.map((e,i)=>{
          const fi=positions[e.from], ti=positions[e.to];
          if(!fi||!ti) return null;
          const a=nodeCenter(e.from), b=nodeCenter(e.to);
          const dx=b.x-a.x, dy=b.y-a.y;
          const sx=Math.sign(dx)||1;
          const y1=fi.y+fi.h/2, y2=ti.y+ti.h/2;
          const x1=sx>0?fi.x+nodeW:fi.x;
          const x2=sx>0?ti.x:ti.x+nodeW;
          const mx=(x1+x2)/2;
          const isHover=hoveredEdge===i||hoveredTable===e.from||hoveredTable===e.to;
          const lbl=(details[e.from]?.columns.find(c=>c.name===e.column)?.comment||e.column).slice(0,14);
          return <g key={i} onMouseEnter={()=>setHoveredEdge(i)} onMouseLeave={()=>setHoveredEdge(null)} style={{cursor:'pointer'}}>
            <path d={`M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`} fill="none" stroke={isHover?'#6d5dfc':'url(#edgeLine)'} strokeWidth={isHover?3:2} strokeLinecap="round" markerEnd={isHover?'url(#arrowHover)':'url(#arrow)'} opacity={isHover?1:.7}/>
            <rect x={mx-32} y={((y1+y2)/2)-11} width="64" height="22" rx="11" fill={isHover?'#6d5dfc':'#f5f3ff'} stroke={isHover?'#6d5dfc':'#c4b5fd'} strokeWidth="1"/>
            <text x={mx} y={((y1+y2)/2)+4} textAnchor="middle" fill={isHover?'#fff':'#7c3aed'} fontSize="9" fontWeight="600" fontFamily="DM Sans">{lbl}</text>
          </g>;
        })}

        {/* Table cards */}
        {displayTables.map((t)=>{
          const p=positions[t.name]; if(!p) return null;
          const d=details[t.name];
          const cols=d?d.columns.filter(c=>c.name!=='created_at'&&c.name!=='updated_at'):[];
          const isHover=hoveredTable===t.name;
          return <g key={t.name} transform={`translate(${p.x},${p.y})`} onMouseEnter={()=>setHoveredTable(t.name)} onMouseLeave={()=>setHoveredTable(null)} style={{cursor:'pointer'}}>
            {/* Card background */}
            <rect width={nodeW} height={p.h} rx="14" fill="#fff" stroke={isHover?'#6366f1':'#e0e7ff'} strokeWidth={isHover?2:1.5} filter={isHover?'url(#cardShadowHover)':'url(#cardShadow)'}/>
            {/* Header */}
            <rect width={nodeW} height={headerH} rx="14" fill="url(#headerGrad)"/>
            <rect y={headerH-14} width={nodeW} height="14" fill="url(#headerGrad)"/>
            <text x="14" y="20" fill="#fff" fontSize="11" fontWeight="800" fontFamily="Manrope">{t.name.replace('nx_','').length>20?t.name.replace('nx_','').slice(0,19)+'…':t.name.replace('nx_','')}</text>
            <text x="14" y="34" fill="rgba(255,255,255,.7)" fontSize="9" fontFamily="ui-monospace">{t.name}</text>
            {/* Rows count */}
            {d&&<text x={nodeW-14} y="28" textAnchor="end" fill="rgba(255,255,255,.6)" fontSize="9" fontFamily="DM Sans">{d.rows.toLocaleString()} filas</text>}
            {/* Columns */}
            {cols.map((c,i)=>{
              const y=headerH+12+i*rowH;
              const isPK=c.key==='PRI';
              const isFK=c.name.endsWith('_id')&&c.name!=='id';
              const isUQ=c.key==='UNI';
              const typeColor=TYPE_COLORS[c.type]||'#64748b';
              return <g key={c.name}>
                {i>0&&<line x1="12" y1={y-4} x2={nodeW-12} y2={y-4} stroke="#f1f5f9" strokeWidth="1"/>}
                {/* Key icons */}
                {isPK&&<text x="10" y={y+10} fontSize="10">🔑</text>}
                {isFK&&!isPK&&<text x="10" y={y+10} fontSize="10">🔗</text>}
                {isUQ&&!isPK&&<text x="10" y={y+10} fontSize="10">⭐</text>}
                {/* Column name */}
                <text x={isPK||isFK||isUQ?24:12} y={y+10} fill={isPK?'#6366f1':isFK?'#0ea5e9':'#334155'} fontSize="10.5" fontWeight={isPK||isFK?'700':'500'} fontFamily="DM Sans">{c.name.length>18?c.name.slice(0,17)+'…':c.name}</text>
                {/* Type badge */}
                <text x={nodeW-10} y={y+10} textAnchor="end" fill={typeColor} fontSize="9" fontWeight="600" fontFamily="ui-monospace" opacity=".8">{shortenType(c.type)}</text>
                {/* Nullable indicator */}
                {c.nullable&&<circle cx={nodeW-48} cy={y+6} r="2.5" fill="none" stroke="#cbd5e1" strokeWidth="1"/>}
              </g>;
            })}
            {cols.length===0&&<text x={nodeW/2} y={headerH+24} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="DM Sans">Sin columnas</text>}
          </g>;
        })}
      </svg>
    </div>
    <div className="er-legend-full">
      <span className="kicker" style={{marginBottom:6}}><GitBranch size={12}/>Leyenda</span>
      <div className="er-legend-items">
        <div className="er-legend-item"><span>🔑</span><small>Llave primaria (PK)</small></div>
        <div className="er-legend-item"><span>🔗</span><small>Llave foránea (FK)</small></div>
        <div className="er-legend-item"><span>⭐</span><small>Único (UQ)</small></div>
        <div className="er-legend-item"><span className="type-dot" style={{background:'#6366f1'}}/><small>Entero</small></div>
        <div className="er-legend-item"><span className="type-dot" style={{background:'#0ea5e9'}}/><small>Texto / VARCHAR</small></div>
        <div className="er-legend-item"><span className="type-dot" style={{background:'#f59e0b'}}/><small>Decimal / Número</small></div>
        <div className="er-legend-item"><span className="type-dot" style={{background:'#10b981'}}/><small>Boolean / TinyInt</small></div>
        <div className="er-legend-item"><span className="type-dot" style={{background:'#ec4899'}}/><small>Fecha / Hora</small></div>
      </div>
      {edges.length>0&&<div className="er-legend-relations" style={{marginTop:10}}>
        <small style={{fontWeight:700,color:'var(--ink)',display:'block',marginBottom:4}}>Relaciones</small>
        {edges.map((e,i)=><div key={i} className="er-legend-row"><code>{e.from.replace('nx_','')}</code><span className="er-legend-arrow">→</span><code>{e.to.replace('nx_','')}</code><small>{e.column}</small></div>)}
      </div>}
    </div>
    </>
    }
  </div>;
}

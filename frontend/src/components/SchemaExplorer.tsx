import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Braces, ChevronLeft, ChevronRight, Code2, Database, Download, Eraser, GitBranch, Key, LoaderCircle, Pencil, Play, Plus, RefreshCw, Search, Sigma, Table2, Trash2, Upload, X, History as HistoryIcon } from 'lucide-react';
import { api } from '../api/client';
import { AuditTab, DbDashboard } from './DbDashboard';
import type { DbOverviewTable, RelationOption, SchemaColumn, SchemaRelationModule, SchemaTable, SchemaTableDetail } from '../types';

const DDL_TYPES = [
  { v:'string', l:'VARCHAR (texto corto)' }, { v:'text', l:'TEXT (texto largo)' },
  { v:'integer', l:'BIGINT (entero)' }, { v:'decimal', l:'DECIMAL (15,2)' },
  { v:'boolean', l:'TINYINT (verdadero/falso)' }, { v:'date', l:'DATE (fecha)' },
  { v:'datetime', l:'DATETIME (fecha y hora)' }, { v:'relation', l:'BIGINT (llave foránea)' },
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
  useEffect(()=>{ if(selected) void api.schemaTable(selected).then(setDetail).catch(e=>setError((e as Error).message)); },[selected]);

  const visible = useMemo(()=>tables.filter(t=>t.name.toLowerCase().includes(filter.toLowerCase())),[tables,filter]);
  const stats = useMemo(()=>{ const map=new Map<string,DbOverviewTable>(); overview.forEach(o=>map.set(o.name,o)); return map; },[overview]);

  async function refreshDetail(){ if(selected){ setDetail(await api.schemaTable(selected)); } await load(true); }

  return <div className="explorer">
    <aside className="panel explorer-list">
      <div className="panel-head slim">
        <div><span className="kicker"><Database size={13}/>{database||'Base de datos'}</span><h2>{tables.length} tablas</h2></div>
        <div className="head-actions"><button className="icon-button" title="Nueva tabla" onClick={()=>setShowCreate(true)}><Plus size={16}/></button><button className="icon-button" title="Recargar" onClick={()=>void load(true)}><RefreshCw size={15}/></button></div>
      </div>
      <label className="search inside"><Search size={15}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrar tablas…"/></label>
      <div className="explorer-tables">
        {visible.map(t=>{ const o=stats.get(t.name); return <button key={t.name} className={selected===t.name?'active':''} onClick={()=>setSelected(t.name)}>
          <Table2 size={15}/><span className="explorer-tname">{t.name}</span>
          <span className="explorer-meta">{o?.rows??'·'} filas{o?` · ${o.size_kb} KB`:''}</span>
          {t.managed?<span className="pill managed">{t.app_label}</span>:<span className="pill raw">raw</span>}
        </button>; })}
      </div>
    </aside>

    <section className="explorer-main">
      <div className="explorer-tabs top">
        {[['dashboard','Resumen',Database],['structure','Estructura',Braces],['browse','Datos',Table2],['sql','Consola SQL',Play],['audit','Auditoría',HistoryIcon],['relations','Relaciones (ER)',GitBranch]].map(([k,l,Icon])=>{ const I=Icon as typeof Braces; return <button key={k as string} className={tab===k?'active':''} onClick={()=>setTab(k as typeof tab)}><I size={15}/>{l as string}</button>; })}
      </div>
      {loading&&!tables.length?<div className="center-state small"><LoaderCircle className="spin"/><p>Leyendo el esquema…</p></div>:
       error?<div className="error-box">{error}<button className="button ghost" onClick={()=>void load(true)}>Reintentar</button></div>:
       tab==='dashboard'?<DbDashboard/>:
       tab==='audit'?<AuditTab/>:
       tab==='structure'&&(selected&&detail)?<StructureTab detail={detail} stats={stats.get(selected)} onRefresh={refreshDetail} onTableChanged={async next=>{await load(false);if(next)setSelected(next);}}/>:
       tab==='browse'&&selected?<BrowseTab table={selected} columns={detail?.columns??[]} onChanged={refreshDetail}/>:
       tab==='sql'?<SqlTab/>:
        tab==='relations'?<RelationsGraph relations={relations} tables={tables}/>:
       <div className="center-state small"><Database/><p>Selecciona una tabla.</p></div>}
    </section>
    {showCreate&&<CreateTableModal onClose={()=>setShowCreate(false)} onCreated={async t=>{setShowCreate(false);await load(true);setSelected(t);setTab('structure');}}/>}
  </div>;
}

/* ================= Structure tab: columns DDL + indexes + table actions ================= */
function StructureTab({detail,stats,onRefresh,onTableChanged}:{detail:SchemaTableDetail;stats?:DbOverviewTable;onRefresh:()=>Promise<void>;onTableChanged:(next?:string)=>Promise<void>}){
  const [colModal,setColModal] = useState<{mode:'add'|'edit';column?:SchemaColumn}|null>(null);
  const [idxModal,setIdxModal] = useState(false);
  const [busy,setBusy] = useState(false);

  async function dropColumn(name:string){ if(!confirm(`¿Eliminar la columna "${name}"? Los datos se perderán.`))return; setBusy(true);
    try{ await api.dropDbColumn(detail.table,name); await onRefresh(); }finally{ setBusy(false); } }
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
    <div className="panel-head slim">
      <div><span className="kicker"><Braces size={13}/>Estructura</span><h2>{detail.table}</h2></div>
      <div className="structure-meta">
        {detail.managed_by&&<span className="pill managed">{detail.managed_by}</span>}
        {stats&&<span className="pill">{stats.engine} · {stats.rows??'—'} filas · {stats.size_kb} KB</span>}
        <button className="icon-button" title="Agregar columna" onClick={()=>setColModal({mode:'add'})}><Plus size={15}/></button>
        <button className="icon-button" title="Nuevo índice" onClick={()=>setIdxModal(true)}><Sigma size={15}/></button>
        <button className="icon-button" title="Renombrar tabla" onClick={()=>void renameTable()}><Pencil size={14}/></button>
        <button className="icon-button" title="Vaciar tabla" onClick={()=>void truncate()}><Eraser size={14}/></button>
        <button className="icon-button danger" title="Eliminar tabla" onClick={()=>void dropTable()}><Trash2 size={14}/></button>
      </div>
    </div>
    <div className="table-wrap"><table>
      <thead><tr><th>#</th><th>Columna</th><th>Tipo</th><th>Nulo</th><th>Llave</th><th>Default</th><th>Acciones</th></tr></thead>
      <tbody>
        <tr className="locked-row"><td>—</td><td><b>id</b></td><td><code>bigint unsigned</code></td><td>NO</td><td><span className="pill managed"><Key size={11}/>PK</span></td><td>—</td><td className="muted">sistema</td></tr>
        {detail.columns.filter(c=>c.name!=='id'&&c.name!=='created_at'&&c.name!=='updated_at').map((c,i)=><tr key={c.name}>
          <td>{i+1}</td><td><b>{c.name}</b></td><td><code>{c.type}</code></td><td>{c.nullable?'SÍ':'NO'}</td>
          <td>{c.key==='UNI'?<span className="pill managed">Única</span>:c.key==='MUL'?<span className="pill raw">IDX</span>:'—'}</td>
          <td>{c.default??'—'}</td>
          <td><div className="row-actions"><button title="Modificar" onClick={()=>setColModal({mode:'edit',column:c})}><Pencil size={14}/></button><button className="danger" title="Eliminar" disabled={busy} onClick={()=>void dropColumn(c.name)}><Trash2 size={14}/></button></div></td>
        </tr>)}
      </tbody>
    </table></div>
    <div className="index-box"><span className="kicker">Índices</span>
      {detail.indexes.map(ix=><div key={ix.name} className="index-row">
        <span className={`pill ${ix.name==='PRIMARY'?'managed':ix.unique?'managed':'raw'}`}>{ix.name==='PRIMARY'?'PRIMARY':ix.unique?'UNIQUE':'INDEX'}</span>
        <b>{ix.name}</b><small>({ix.columns.join(', ')})</small>
        {ix.name!=='PRIMARY'&&<button className="row-delete" onClick={()=>void dropIndex(ix.name)}><Trash2 size={13}/></button>}
      </div>)}
    </div>
    {colModal&&<ColumnModal table={detail.table} mode={colModal.mode} column={colModal.column} onClose={()=>setColModal(null)} onDone={async()=>{setColModal(null);await onRefresh();}}/>}
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
        <button className="icon-button" title="Importar CSV" onClick={()=>fileRef.current?.click()}><Upload size={15}/></button>
        <button className="icon-button" title="Exportar CSV" onClick={()=>void api.exportTable(table,'csv')}><Download size={15}/></button>
        <button className="icon-button" title="Exportar JSON" onClick={()=>void api.exportTable(table,'json')}><Braces size={15}/></button>
        <button className="icon-button" title="Exportar SQL (INSERTs)" onClick={()=>void api.exportTable(table,'sql')}><Database size={15}/></button>
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
function ColumnModal({table,mode,column,onClose,onDone}:{table:string;mode:'add'|'edit';column?:SchemaColumn;onClose:()=>void;onDone:()=>Promise<void>}){
  const typeOf = (t:string)=>DDL_TYPES.find(d=>t.startsWith(d.v))?.v??'string';
  const [form,setForm] = useState({ name:column?.name??'', data_type:column?typeOf(column.type):'string', length:column&&column.type.includes('varchar')?parseInt(column.type.replace(/\D/g,''))||255:255,
    nullable:column?.nullable??true, default_value:column?.default??'', unique:false });
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  async function submit(e:React.FormEvent){ e.preventDefault(); setBusy(true); setError('');
    try{
      if(mode==='add') await api.addDbColumn(table,{...form});
      else await api.modifyDbColumn(table,column!.name,{data_type:form.data_type,length:form.data_type==='string'?form.length:null,nullable:form.nullable,default_value:form.default_value||null,unique:form.unique});
      await onDone();
    }catch(err){ setError((err as Error).message); }finally{ setBusy(false); } }
  return <ModalShell title={mode==='add'?`Nueva columna en ${table}`:`Modificar ${column?.name}`} onClose={onClose}>
    <form className="modal-body" onSubmit={submit}>
      {mode==='add'&&<label className="control"><span>Nombre</span><input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="telefono" required/></label>}
      <div className="form-grid three">
        <label className="control"><span>Tipo</span><select value={form.data_type} onChange={e=>setForm({...form,data_type:e.target.value})}>{DDL_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select></label>
        {form.data_type==='string'&&<label className="control"><span>Longitud</span><input type="number" min={1} max={1000} value={form.length} onChange={e=>setForm({...form,length:Number(e.target.value)})}/></label>}
        <label className="control"><span>Default</span><input value={form.default_value} onChange={e=>setForm({...form,default_value:e.target.value})} placeholder="—"/></label>
      </div>
      <div className="toggle-row"><label className="check"><input type="checkbox" checked={form.nullable} onChange={e=>setForm({...form,nullable:e.target.checked})}/><span>Acepta nulos</span></label>
        {mode==='edit'&&<label className="check"><input type="checkbox" checked={form.unique} onChange={e=>setForm({...form,unique:e.target.checked})}/><span>Valor único</span></label>}</div>
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

function CreateTableModal({onClose,onCreated}:{onClose:()=>void;onCreated:(table:string)=>Promise<void>}){
  const [name,setName] = useState(''); const [cols,setCols] = useState<{name:string;data_type:string;length:number;nullable:boolean}[]>([{name:'',data_type:'string',length:255,nullable:true}]);
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  async function submit(e:React.FormEvent){ e.preventDefault(); setBusy(true); setError('');
    try{ const r = await api.createDbTable({name,columns:cols.filter(c=>c.name.trim()).map(c=>({...c}))}); await onCreated(r.table); }
    catch(err){ setError((err as Error).message); }finally{ setBusy(false); } }
  return <ModalShell title="Nueva tabla de base de datos" onClose={onClose} wide>
    <form className="modal-body" onSubmit={submit}>
      <div className="callout"><Database size={20}/><div><strong>Se creará una tabla real</strong><p>Con <code>id</code> auto-incremental y timestamps. Prefijo <code>nx_</code> automático.</p></div></div>
      <label className="control"><span>Nombre</span><input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Proyectos" required/></label>
      <div className="control"><span>Columnas iniciales</span>
        <div className="col-defs">{cols.map((c,i)=><div key={i} className="col-def">
          <input value={c.name} onChange={e=>setCols(v=>v.map((x,j)=>j===i?{...x,name:e.target.value}:x))} placeholder="nombre_columna"/>
          <select value={c.data_type} onChange={e=>setCols(v=>v.map((x,j)=>j===i?{...x,data_type:e.target.value}:x))}>{DDL_TYPES.filter(t=>t.v!=='relation').map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select>
          {c.data_type==='string'&&<input type="number" value={c.length} min={1} max={1000} onChange={e=>setCols(v=>v.map((x,j)=>j===i?{...x,length:Number(e.target.value)}:x))} title="Longitud"/>}
          <label className="check"><input type="checkbox" checked={c.nullable} onChange={e=>setCols(v=>v.map((x,j)=>j===i?{...x,nullable:e.target.checked}:x))}/><span>null</span></label>
          <button type="button" className="row-delete" onClick={()=>setCols(v=>v.filter((_,j)=>j!==i))} disabled={cols.length===1}><X size={14}/></button>
        </div>)}
        <button type="button" className="button ghost" onClick={()=>setCols(v=>[...v,{name:'',data_type:'string',length:255,nullable:true}])}><Plus size={15}/>Agregar columna</button></div></div>
      {error&&<p className="error-box">{error}</p>}
      <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy||!name.trim()}>{busy?<LoaderCircle className="spin" size={15}/>:null}Crear tabla</button></div>
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

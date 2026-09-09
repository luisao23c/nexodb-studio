import { useEffect, useState } from 'react';
import { Activity, Database, HardDrive, History, LoaderCircle, Search, Table2 } from 'lucide-react';
import { api } from '../api/client';
import type { AuditEntry, DashboardData } from '../types';

const ACTION_LABELS: Record<string,string> = {
  'module.create':'Módulo creado','field.create':'Campo creado','field.modify':'Campo modificado',
  'table.create':'Tabla creada','table.drop':'Tabla eliminada','table.rename':'Tabla renombrada','table.truncate':'Tabla vaciada',
  'column.modify':'Columna modificada','column.drop':'Columna eliminada','index.create':'Índice creado','index.drop':'Índice eliminado',
  'export':'Exportación','import':'Importación','record.delete':'Registro eliminado',
};

export function DbDashboard() {
  const [data,setData] = useState<DashboardData|null>(null);
  const [loading,setLoading] = useState(true);
  useEffect(()=>{ void api.dashboard().then(setData).finally(()=>setLoading(false)); },[]);
  if(loading||!data) return <div className="center-state small"><LoaderCircle className="spin"/><p>Calculando estadísticas…</p></div>;
  const maxAct = Math.max(1,...data.activity.map(a=>a.c));

  return <div className="db-dash">
    <div className="stat-cards">
      <div className="stat-card"><Database size={20}/><div><b>{data.total_tables}</b><span>Tablas nx_</span></div></div>
      <div className="stat-card"><Table2 size={20}/><div><b>{data.total_rows.toLocaleString('es-MX')}</b><span>Filas totales</span></div></div>
      <div className="stat-card"><HardDrive size={20}/><div><b>{data.total_size_kb} KB</b><span>Espacio usado</span></div></div>
      <div className="stat-card"><Activity size={20}/><div><b>{data.activity.reduce((s,a)=>s+a.c,0)}</b><span>Acciones (7 días)</span></div></div>
    </div>
    <div className="dash-row">
      <div className="panel dash-panel">
        <div className="panel-head slim"><div><span className="kicker"><Activity size={13}/>Actividad</span><h2>Últimos 7 días</h2></div></div>
        <div className="spark">{data.activity.length?data.activity.map(a=><div key={a.d} className="spark-col" title={`${a.d}: ${a.c} acciones`}><i style={{height:`${Math.max(a.c/maxAct*56,6)}px`}}/><small>{a.d.slice(5)}</small></div>):<p className="empty-cell small">Sin actividad registrada aún.</p>}</div>
      </div>
      <div className="panel dash-panel">
        <div className="panel-head slim"><div><span className="kicker"><History size={13}/>Reciente</span><h2>Últimas acciones</h2></div></div>
        <div className="recent-list">{data.recent.map((r,i)=><div key={i} className="recent-row"><span className={`pill ${r.action.includes('drop')?'danger':r.action.includes('create')?'managed':'raw'}`}>{ACTION_LABELS[r.action]??r.action}</span><b>{r.target??'—'}</b><small>{new Date(r.created_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</small></div>)}
          {!data.recent.length&&<p className="empty-cell small">Sin acciones todavía.</p>}</div>
      </div>
    </div>
    <div className="panel dash-panel">
      <div className="panel-head slim"><div><span className="kicker"><HardDrive size={13}/>Almacenamiento</span><h2>{data.database}</h2></div></div>
      <div className="table-wrap"><table>
        <thead><tr><th>Tabla</th><th>Motor</th><th>Filas</th><th>Tamaño</th></tr></thead>
        <tbody>{data.tables.map(t=><tr key={t.name}><td><b>{t.name}</b></td><td>{t.engine}</td><td>{t.rows??'—'}</td><td>{t.size_kb} KB</td></tr>)}
        {!data.tables.length&&<tr><td colSpan={4} className="empty-cell">Sin tablas.</td></tr>}</tbody>
      </table></div>
    </div>
  </div>;
}

export function AuditTab() {
  const [entries,setEntries] = useState<AuditEntry[]>([]);
  const [action,setAction] = useState(''); const [target,setTarget] = useState('');
  const [loading,setLoading] = useState(true);
  const load = () => { setLoading(true); api.audit(action,target).then(setEntries).finally(()=>setLoading(false)); };
  useEffect(load,[]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="panel audit-panel">
    <div className="table-tools">
      <div className="audit-filters">
        <select value={action} onChange={e=>setAction(e.target.value)} aria-label="Filtrar por acción">
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        <label className="search"><Search size={15}/><input value={target} onChange={e=>setTarget(e.target.value)} placeholder="Filtrar por tabla o columna…"/></label>
        <button className="button ghost" onClick={load}>Filtrar</button>
      </div>
      <span>{entries.length} eventos</span>
    </div>
    <div className="audit-timeline">
      {loading?<div className="center-state small"><LoaderCircle className="spin"/></div>:
       entries.map(e=><div key={e.id} className="audit-row">
        <span className={`audit-dot ${e.action.includes('drop')?'danger':e.action.includes('create')?'ok':'info'}`}/>
        <div className="audit-info">
          <strong>{ACTION_LABELS[e.action]??e.action}</strong>
          <small>{e.target??''}{e.sql_statement?` · ${e.sql_statement.slice(0,80)}`:''}</small>
        </div>
        <span className="audit-meta">{new Date(e.created_at).toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · {e.ip}</span>
      </div>)}
      {!loading&&!entries.length&&<p className="empty-cell">Sin eventos registrados.</p>}
    </div>
  </div>;
}

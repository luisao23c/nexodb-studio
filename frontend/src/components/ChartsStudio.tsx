import { useEffect, useState, type FormEvent } from 'react';
import { BarChart3, LoaderCircle, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import type { Chart, ChartData, SchemaColumn, SchemaTable } from '../types';
import { ChartView } from './ChartView';

const TYPE_LABELS = {bar:'Barras',line:'Líneas',area:'Área',pie:'Pastel',donut:'Dona'} as const;
const AGG_LABELS = {count:'Conteo',sum:'Suma',avg:'Promedio',min:'Mínimo',max:'Máximo'} as const;

export function ChartsStudio({tables}:{tables:SchemaTable[]}) {
  const [charts,setCharts] = useState<Chart[]>([]);
  const [data,setData] = useState<Record<number,ChartData>>({});
  const [showForm,setShowForm] = useState(false);
  const [loading,setLoading] = useState(true);

  async function load(){ setLoading(true); try{
    const list = await api.charts(); setCharts(list);
    const entries = await Promise.all(list.map(async c=>[c.id, await api.chartData(c.id).catch(()=>null)] as const));
    setData(Object.fromEntries(entries.filter(([,d])=>d).map(([id,d])=>[id,d!])));
  }finally{ setLoading(false); } }
  useEffect(()=>{void load();},[]);
  async function remove(id:number){ if(!confirm('¿Eliminar esta gráfica?'))return; await api.deleteChart(id); setCharts(v=>v.filter(c=>c.id!==id)); }

  if(loading) return <div className="center-state small"><LoaderCircle className="spin"/><p>Cargando gráficas…</p></div>;
  return <div className="charts-studio">
    <div className="section-hero compact"><div><span className="kicker"><BarChart3 size={13}/>Analítica conectada</span><h1>Gráficas sobre tablas reales</h1><p>Crea indicadores sin una capa de módulos intermedia.</p></div><div className="hero-actions"><button className="icon-button" onClick={()=>void load()} aria-label="Recargar"><RefreshCw size={16}/></button><button className="button primary" onClick={()=>setShowForm(v=>!v)}><Plus size={16}/>Nueva gráfica</button></div></div>
    {showForm&&<ChartForm tables={tables} onCreated={chart=>{setCharts(v=>[...v,chart]);setShowForm(false);void api.chartData(chart.id).then(d=>setData(prev=>({...prev,[chart.id]:d}))).catch(()=>{});}}/>}
    <div className="charts-grid">
      {charts.map(c=><div className="panel chart-card" key={c.id}><div className="chart-card-head"><div><strong>{c.name}</strong><small>{c.table_name} · {AGG_LABELS[c.aggregate]}{c.aggregate!=='count'?`(${c.value_field})`:''} por {c.label_field}</small></div><button className="row-delete" onClick={()=>void remove(c.id)} aria-label="Eliminar gráfica"><Trash2 size={14}/></button></div>{data[c.id]?<ChartView chart={data[c.id].chart} data={data[c.id].data}/>:<div className="chart-empty">Sin datos o error al calcular.</div>}</div>)}
      {!charts.length&&<div className="panel empty-chart-card"><BarChart3 size={40}/><h3>El dashboard está vacío</h3><p>Crea una gráfica eligiendo una tabla, una etiqueta y un agregado.</p></div>}
    </div>
  </div>;
}

function ChartForm({tables,onCreated}:{tables:SchemaTable[];onCreated:(c:Chart)=>void}){
  const [form,setForm] = useState({name:'',table_name:tables[0]?.name??'',chart_type:'bar' as Chart['chart_type'],label_field:'',value_field:'',aggregate:'count' as Chart['aggregate'],sort_direction:'desc' as Chart['sort_direction'],limit:10,color:'#6d5dfc'});
  const [columns,setColumns] = useState<SchemaColumn[]>([]); const [saving,setSaving] = useState(false); const [error,setError] = useState('');
  useEffect(()=>{ if(!form.table_name){setColumns([]);return;} api.schemaTable(form.table_name).then(d=>setColumns(d.columns)).catch(e=>setError((e as Error).message)); },[form.table_name]);
  const numeric = columns.filter(c=>/int|decimal|double|float/.test(c.type));
  async function submit(e:FormEvent){ e.preventDefault(); setSaving(true); setError(''); try{onCreated(await api.createChart({...form,value_field:form.value_field||null,active:true}));}catch(err){setError((err as Error).message);}finally{setSaving(false);} }
  if(!tables.length) return <div className="panel chart-form"><p className="empty-cell">Necesitas al menos una tabla de datos.</p></div>;
  return <form className="panel chart-form" onSubmit={submit}>
    <div className="form-grid four">
      <label className="control"><span>Nombre</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ventas por estado" required/></label>
      <label className="control"><span>Tabla</span><select value={form.table_name} onChange={e=>setForm({...form,table_name:e.target.value,label_field:'',value_field:''})}>{tables.map(t=><option key={t.name} value={t.name}>{t.app_label||t.name} · {t.name}</option>)}</select></label>
      <label className="control"><span>Tipo</span><select value={form.chart_type} onChange={e=>setForm({...form,chart_type:e.target.value as Chart['chart_type']})}>{Object.entries(TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label className="control"><span>Etiqueta</span><select value={form.label_field} onChange={e=>setForm({...form,label_field:e.target.value})} required><option value="">Seleccionar…</option>{columns.map(c=><option key={c.name} value={c.name}>{c.name} · {c.type}</option>)}</select></label>
      <label className="control"><span>Agregado</span><select value={form.aggregate} onChange={e=>setForm({...form,aggregate:e.target.value as Chart['aggregate']})}>{Object.entries(AGG_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label className="control"><span>Campo de valor</span><select value={form.value_field} onChange={e=>setForm({...form,value_field:e.target.value})} disabled={form.aggregate==='count'} required={form.aggregate!=='count'}><option value="">Seleccionar…</option>{numeric.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}</select></label>
      <label className="control"><span>Orden</span><select value={form.sort_direction} onChange={e=>setForm({...form,sort_direction:e.target.value as Chart['sort_direction']})}><option value="desc">Descendente</option><option value="asc">Ascendente</option></select></label>
      <label className="control"><span>Límite</span><input type="number" min={1} max={50} value={form.limit} onChange={e=>setForm({...form,limit:Number(e.target.value)})}/></label>
    </div>{error&&<p className="error-box">{error}</p>}<div className="builder-actions"><button className="button primary" disabled={saving||!form.name||!form.label_field}>{saving?<LoaderCircle className="spin" size={15}/>:null}Crear gráfica</button></div>
  </form>;
}

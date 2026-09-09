import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Edit3, LoaderCircle, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { formatValue } from '../lib/format';
import type { Choice, Field, Module, Page } from '../types';
import { Modal } from './Modal';

type Row = Record<string,unknown>;

function InputForField({field,value,onChange,choices}:{field:Field;value:unknown;onChange:(value:unknown)=>void;choices:Choice[]}) {
  if(field.data_type==='boolean') return <label className="switch"><input type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)}/><span/><em>{value?'Sí':'No'}</em></label>;
  if(field.data_type==='relation'&&field.input_type==='autocomplete') {
    const selected=choices.find(option=>option.id===Number(value)); const shown=selected?.label??(typeof value==='string'?value:'');
    return <><input list={`choices-${field.id}`} value={shown} placeholder="Escribe para buscar…" onChange={e=>{const match=choices.find(option=>option.label.toLocaleLowerCase()===e.target.value.toLocaleLowerCase());onChange(match?.id??e.target.value)}} onBlur={e=>{if(e.target.value&&!choices.some(option=>option.label.toLocaleLowerCase()===e.target.value.toLocaleLowerCase()))onChange(null)}} required={field.required}/><datalist id={`choices-${field.id}`}>{choices.map(o=><option value={o.label} key={o.id}/>)}</datalist></>;
  }
  if(field.data_type==='relation') return <select value={String(value??'')} onChange={e=>onChange(e.target.value?Number(e.target.value):null)} required={field.required}><option value="">Seleccionar…</option>{choices.map(o=><option value={o.id} key={o.id}>{o.label}</option>)}</select>;
  if(field.input_type==='textarea') return <textarea rows={4} value={String(value??'')} onChange={e=>onChange(e.target.value)} required={field.required}/>;
  if(field.input_type==='select'&&field.options?.length) return <select value={String(value??'')} onChange={e=>onChange(e.target.value)} required={field.required}><option value="">Seleccionar…</option>{field.options.map(o=><option key={o}>{o}</option>)}</select>;
  const type=field.input_type==='datetime-local'?'datetime-local':field.input_type==='email'?'email':field.data_type==='date'?'date':['integer','decimal'].includes(field.data_type)?'number':'text';
  return <input type={type} step={field.data_type==='decimal'?'0.01':undefined} value={String(value??'')} onChange={e=>onChange(type==='number'&&e.target.value!==''?Number(e.target.value):e.target.value)} required={field.required}/>;
}

export function RecordsView({module}:{module:Module}) {
  const [page,setPage]=useState<Page<Row>|null>(null); const [search,setSearch]=useState(''); const [pageNumber,setPageNumber]=useState(1); const [loading,setLoading]=useState(false); const [editing,setEditing]=useState<Row|null|undefined>(undefined); const [form,setForm]=useState<Row>({}); const [choices,setChoices]=useState<Record<number,Choice[]>>({}); const [error,setError]=useState('');
  const columns=useMemo(()=>module.fields.filter(f=>f.show_in_table),[module]); const formFields=useMemo(()=>module.fields.filter(f=>f.show_in_form),[module]);
  async function load(){setLoading(true);try{setPage(await api.records(module.id,search,pageNumber))}catch(err){setError((err as Error).message)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[module.id,pageNumber]);
  useEffect(()=>{const timer=setTimeout(()=>{setPageNumber(1);void load()},350);return()=>clearTimeout(timer)},[search]);
  async function openForm(row:Row|null){setEditing(row);setForm(row?Object.fromEntries(formFields.map(f=>[f.name,row[f.name]??''])):Object.fromEntries(formFields.map(f=>[f.name,f.data_type==='boolean'?false:(f.default_value??'')])));setError('');const relationIds=[...new Set(formFields.filter(f=>f.related_module_id).map(f=>f.related_module_id!))];const loaded=await Promise.all(relationIds.map(async id=>[id,await api.options(id)] as const));setChoices(Object.fromEntries(loaded))}
  async function save(e:FormEvent){e.preventDefault();setLoading(true);setError('');try{await api.saveRecord(module.id,form,editing?Number(editing.id):undefined);setEditing(undefined);await load()}catch(err){setError((err as Error).message)}finally{setLoading(false)}}
  async function remove(row:Row){if(!confirm(`¿Eliminar el registro #${row.id}? Esta acción no se puede deshacer.`))return;await api.deleteRecord(module.id,Number(row.id));await load()}
  function display(row:Row,field:Field){
    const value=field.data_type==='relation'?row[`${field.name}_display`]??row[field.name]:row[field.name];
    if(field.data_type==='boolean')return value?<span className="yes">Sí</span>:<span className="no">No</span>;
    return formatValue(value,field).html;
  }

  return <section className="panel data-panel">
    <div className="data-toolbar"><div><span className="kicker">Datos en vivo</span><h2>{module.name}</h2><p>{page?.total??0} registros en <code>{module.table_name}</code></p></div><button className="button primary" onClick={()=>void openForm(null)} disabled={!formFields.length}><Plus size={17}/>Nuevo registro</button></div>
    <div className="table-tools"><label className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar en campos configurados…"/></label><span>{columns.length} columnas visibles</span></div>
    {error&&editing===undefined&&<p className="error-box">{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>ID</th>{columns.map(f=><th key={f.id}>{f.label}</th>)}<th className="actions-col">Acciones</th></tr></thead><tbody>{loading&&!page?<tr><td colSpan={columns.length+2} className="empty-cell"><LoaderCircle className="spin"/>Cargando…</td></tr>:page?.data.length?page.data.map(row=><tr key={String(row.id)}><td><span className="record-id">#{String(row.id).padStart(3,'0')}</span></td>{columns.map(f=><td key={f.id}>{display(row,f)}</td>)}<td><div className="row-actions"><button onClick={()=>void openForm(row)} aria-label="Editar"><Edit3 size={16}/></button><button className="danger" onClick={()=>void remove(row)} aria-label="Eliminar"><Trash2 size={16}/></button></div></td></tr>):<tr><td colSpan={columns.length+2} className="empty-cell">{module.fields.length?'Aún no hay registros. Crea el primero.':'Primero define los campos del módulo.'}</td></tr>}</tbody></table></div>
    {page&&page.last_page>1&&<footer className="pagination"><span>Página {page.current_page} de {page.last_page}</span><div><button disabled={page.current_page===1} onClick={()=>setPageNumber(v=>v-1)}><ChevronLeft/></button><button disabled={page.current_page===page.last_page} onClick={()=>setPageNumber(v=>v+1)}><ChevronRight/></button></div></footer>}
    {editing!==undefined&&<Modal title={editing?`Editar registro #${editing.id}`:`Nuevo registro en ${module.name}`} onClose={()=>setEditing(undefined)} wide><form id="record-form" className="modal-body" onSubmit={save}><div className="record-form">{formFields.map(field=><label className="control" key={field.id}><span>{field.label}{field.required&&<b> *</b>}</span><InputForField field={field} value={form[field.name]} onChange={value=>setForm({...form,[field.name]:value})} choices={choices[field.related_module_id??0]??[]}/><small>{field.name} · {field.data_type}</small></label>)}</div>{error&&<p className="error-box">{error}</p>}<div className="modal-actions"><button type="button" className="button ghost" onClick={()=>setEditing(undefined)}>Cancelar</button><button className="button primary" disabled={loading}>{loading?<LoaderCircle className="spin" size={16}/>:null}Guardar registro</button></div></form></Modal>}
  </section>;
}

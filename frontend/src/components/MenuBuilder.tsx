import { useEffect, useState, type FormEvent } from 'react';
import { ChevronDown, Circle, FolderTree, Link, LoaderCircle, Plus, Route, Save, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import type { Chart, Menu, MenuItem, Module, Role } from '../types';

export function MenuBuilder({modules,charts}: {modules:Module[];charts:Chart[]}) {
  const [menus,setMenus] = useState<Menu[]>([]);
  const [roles,setRoles] = useState<Role[]>([]);
  const [activeId,setActiveId] = useState<number|null>(null);
  const [newMenu,setNewMenu] = useState('');
  const [editing,setEditing] = useState<MenuItem|null>(null);
  const [loading,setLoading] = useState(true);

  async function load(){ setLoading(true); try{ setMenus(await api.menus()); setRoles(await api.roles()); setActiveId(c=>c??menus[0]?.id??null);}finally{setLoading(false);} }
  useEffect(()=>{void load();},[]); // eslint-disable-line react-hooks/exhaustive-deps
  const menu = menus.find(m=>m.id===activeId)??null;

  async function createMenu(e:FormEvent){ e.preventDefault(); if(!newMenu.trim())return; const m=await api.createMenu({name:newMenu}); setMenus(v=>[...v,m]); setActiveId(m.id); setNewMenu(''); }
  async function removeMenu(id:number){ if(!confirm('¿Eliminar este menú con todos sus elementos?'))return; await api.deleteMenu(id); setMenus(v=>v.filter(m=>m.id!==id)); setActiveId(null); }
  async function saveItem(item:Partial<MenuItem>&{role_ids?:number[]}){
    if(!menu) return;
    if(editing){ await api.updateMenuItem(menu.id,editing.id,{...item}); } else { await api.createMenuItem(menu.id,{...item}); }
    setEditing(null); setMenus(await api.menus());
  }
  async function removeItem(item:MenuItem){ if(!menu||!confirm(`¿Eliminar "${item.label}"?`))return; await api.deleteMenuItem(menu.id,item.id); setMenus(await api.menus()); }
  async function move(item:MenuItem,dir:-1|1){
    if(!menu) return; const ids=menu.items.map(i=>i.id); const idx=ids.indexOf(item.id); const swap=idx+dir;
    if(swap<0||swap>=ids.length) return; [ids[idx],ids[swap]]=[ids[swap],ids[idx]];
    await api.reorderMenuItems(menu.id,ids); setMenus(await api.menus());
  }

  if(loading) return <div className="center-state small"><LoaderCircle className="spin"/><p>Cargando menús…</p></div>;

  return <section className="panel">
      <div className="panel-head">
        <div><span className="kicker"><Route size={13}/>Constructor de rutas</span><h2>Menús de la aplicación</h2></div>
        <form className="inline-form" onSubmit={createMenu}><input value={newMenu} onChange={e=>setNewMenu(e.target.value)} placeholder="Nuevo menú…"/><button className="button primary" disabled={!newMenu.trim()}><Plus size={16}/>Crear</button></form>
      </div>
      <div className="menu-cols">
        <div className="menu-list-col">
          {menus.map(m=><div key={m.id} className={`menu-block ${activeId===m.id?'active':''}`}>
            <div className="menu-head" role="button" tabIndex={0} onClick={()=>setActiveId(m.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setActiveId(m.id);}}><FolderTree size={16}/><strong>{m.name}</strong><span className="pill">{m.items.length} items</span><button className="row-delete" onClick={e=>{e.stopPropagation();void removeMenu(m.id);}} aria-label="Eliminar menú"><Trash2 size={14}/></button></div>
            {activeId===m.id&&<div className="menu-items">
              {m.items.length===0&&<p className="muted small-note">Sin elementos. Agrega el primero →</p>}
              {m.items.map((item,idx)=><div key={item.id} className="menu-item-row">
                <Circle size={9} className="dot"/>
                <div className="menu-item-info"><strong>{item.label}</strong><small>{describeTarget(item)}{item.required_role_ids?.length?` · ${roles.filter(r=>item.required_role_ids!.includes(r.id)).map(r=>r.name).join(', ')}`:''}</small></div>
                {item.badge&&<span className="pill managed">{item.badge}</span>}
                <button onClick={()=>move(item,-1)} disabled={idx===0}>↑</button><button onClick={()=>move(item,1)} disabled={idx===m.items.length-1}>↓</button>
                <button className="row-edit" onClick={()=>setEditing(item)}>✎</button>
                <button className="row-delete" onClick={()=>void removeItem(item)}><Trash2 size={14}/></button>
              </div>)}
              <button className="button ghost add-item" onClick={()=>{setEditing(null);document.getElementById('item-form')?.scrollIntoView({behavior:'smooth'});}}><Plus size={15}/>Nuevo elemento</button>
            </div>}
          </div>)}
          {!menus.length&&<p className="empty-cell">Crea tu primer menú para estructurar la app.</p>}
        </div>
        <ItemForm key={editing?.id??'new'} menu={menu} editing={editing} roles={roles} modules={modules} charts={charts} onSave={saveItem} onCancel={()=>setEditing(null)}/>
      </div>
    </section>;
}

function describeTarget(item:MenuItem){
  if(item.target_type==='url') return item.url??'';
  if(item.target_type==='chart_dashboard') return 'Dashboard de gráficas';
  if(item.target_type==='page') return `Página #${item.target_id}`;
  return `Módulo #${item.target_id}`;
}

function ItemForm({menu,editing,roles,modules,charts,onSave,onCancel}:{menu:Menu|null;editing:MenuItem|null;roles:Role[];modules:Module[];charts:Chart[];onSave:(item:Partial<MenuItem>&{role_ids?:number[]})=>Promise<void>;onCancel:()=>void}){
  const [label,setLabel] = useState(editing?.label??'');
  const [targetType,setTargetType] = useState(editing?.target_type??'module');
  const [targetId,setTargetId] = useState<string>(String(editing?.target_id??''));
  const [url,setUrl] = useState(editing?.url??'');
  const [badge,setBadge] = useState(editing?.badge??'');
  const [roleIds,setRoleIds] = useState<number[]>(editing?.required_role_ids??[]);
  const [saving,setSaving] = useState(false);

  async function submit(e:FormEvent){ e.preventDefault(); setSaving(true); try{
    await onSave({ label, target_type:targetType, target_id:targetId?Number(targetId):null, url:targetType==='url'?url:null, badge:badge||null, role_ids:roleIds });
  }finally{ setSaving(false); } }

  if(!menu) return <aside className="panel preview-panel"><p className="empty-mini">Selecciona o crea un menú.</p></aside>;
  const options = targetType==='module'?modules.map(m=>({v:String(m.id),l:m.name})):targetType==='page'?[]:targetType==='chart_dashboard'?charts.map(c=>({v:String(c.id),l:c.name})):[{v:'',l:'—'}];

  return <aside className="panel preview-panel" id="item-form">
    <span className="kicker"><Link size={13}/>{editing?'Editar elemento':'Nuevo elemento'}</span>
    <h3>{menu.name}</h3>
    <form className="modal-body no-pad" onSubmit={submit}>
      <label className="control"><span>Etiqueta visible</span><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Ej. Usuarios" required/></label>
      <label className="control"><span>Apunta a</span><select value={targetType} onChange={e=>{setTargetType(e.target.value as typeof targetType);setTargetId('');}}>
        <option value="module">Módulo (CRUD)</option><option value="page">Página personalizada</option><option value="chart_dashboard">Dashboard de gráficas</option><option value="url">URL externa</option>
      </select></label>
      {targetType!=='url'&&targetType!=='page'&&<label className="control"><span>Destino</span><select value={targetId} onChange={e=>setTargetId(e.target.value)} required>
        <option value="">Seleccionar…</option>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></label>}
      {targetType==='page'&&<label className="control"><span>ID de página</span><input value={targetId} onChange={e=>setTargetId(e.target.value)} placeholder="Se conecta con el Constructor de páginas" required/></label>}
      {targetType==='url'&&<label className="control"><span>URL</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" required/></label>}
      <label className="control"><span>Badge (opcional)</span><input value={badge} onChange={e=>setBadge(e.target.value)} placeholder="Nuevo"/></label>
      <div className="control"><span>Visible solo para roles <ChevronDown size={12}/></span>
        <div className="role-picks">{roles.map(r=><label key={r.id} className="check"><input type="checkbox" checked={roleIds.includes(r.id)} onChange={e=>setRoleIds(v=>e.target.checked?[...v,r.id]:v.filter(id=>id!==r.id))}/><span className="role-dot" style={{background:r.color}}/>{r.name}</label>)}
        {!roles.length&&<small className="muted">Crea roles en la pestaña Roles y permisos.</small>}</div>
      </div>
      <div className="modal-actions"><button type="button" className="button ghost" onClick={onCancel}>Limpiar</button><button className="button primary" disabled={saving||!label.trim()}>{saving?<LoaderCircle className="spin" size={15}/>:<><Save size={15}/>{editing?'Guardar':'Agregar'}</>}</button></div>
    </form>
  </aside>;
}

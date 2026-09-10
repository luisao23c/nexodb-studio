import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Table2, FormInput, BarChart3, FileText, ArrowRight, Layout, Columns3, Rows3, Maximize2, CreditCard, LoaderCircle, Copy, Check, X } from 'lucide-react';
import { api } from '../api/client';
import type { BuilderForm, BuilderRoute, BuilderView } from '../types';
import { ComponentPalette, ComponentDropZone, renderComponents } from './ComponentPalette';
import type { PageComponent } from './ComponentPalette';

/* ================= Route Tree Node ================= */
function RouteNode({route,depth,selectedId,onSelect,onToggleAdd,onDelete,onRename,addingToParent,newChildName,setNewChildName,onConfirmAdd,busy}:{route:BuilderRoute;depth:number;selectedId:number|null;onSelect:(r:BuilderRoute)=>void;onToggleAdd:(parentId:number)=>void;onDelete:(id:number)=>void;onRename:(id:number,name:string)=>void;addingToParent:number|null;newChildName:string;setNewChildName:(v:string)=>void;onConfirmAdd:()=>void;busy:boolean}){
  const [open,setOpen] = useState(true);
  const [editing,setEditing] = useState(false);
  const [editName,setEditName] = useState(route.name);
  const hasChildren = route.children && route.children.length > 0;
  const isSelected = selectedId === route.id;
  const isAddingHere = addingToParent === route.id;
  const TypeIcon = {table:Table2,form:FormInput,chart:BarChart3,page:FileText,redirect:ArrowRight,divider:Layout,empty:Layout}[route.content_type]||Layout;

  function handleRename(){ if(editName.trim()&&editName!==route.name) onRename(route.id,editName.trim()); setEditing(false); }

  return <div className="route-node">
    <div className={`route-row ${isSelected?'selected':''}`} style={{paddingLeft:depth*20+8}} onClick={()=>onSelect(route)}>
      <span className="route-expand" onClick={e=>{e.stopPropagation();setOpen(!open);}}>
        {hasChildren||isAddingHere?(open?<ChevronDown size={14}/>:<ChevronRight size={14}/>):<span style={{width:14}}/>}
      </span>
      <span className="route-icon" style={{color:route.active?'#4f46e5':'#94a3b8'}}><TypeIcon size={15}/></span>
      {editing?<input className="route-rename-input" value={editName} onChange={e=>setEditName(e.target.value)} onBlur={handleRename} onKeyDown={e=>{if(e.key==='Enter')handleRename();if(e.key==='Escape'){setEditName(route.name);setEditing(false);}}} autoFocus onClick={e=>e.stopPropagation()}/>
        :<span className={`route-name ${!route.active?'muted':''}`}>{route.name}</span>}
      {route.badge_label&&<span className="route-badge" style={{background:route.badge_color||'#6366f1'}}>{route.badge_label}</span>}
      {!route.visible_in_menu&&<EyeOff size={12} className="route-hidden-icon"/>}
      <div className="route-actions" onClick={e=>e.stopPropagation()}>
        {busy&&isAddingHere&&<LoaderCircle size={12} className="spin"/>}
        <button title="Agregar hijo" onClick={()=>onToggleAdd(route.id)}><Plus size={13}/></button>
        <button title="Renombrar" onClick={()=>setEditing(true)}><Pencil size={12}/></button>
        <button className="danger" title="Eliminar" onClick={()=>onDelete(route.id)}><Trash2 size={12}/></button>
      </div>
    </div>
    {open&&(hasChildren||isAddingHere)&&<div className="route-children">
      {route.children&&route.children.map(c=><RouteNode key={c.id} route={c} depth={depth+1} selectedId={selectedId} onSelect={onSelect} onToggleAdd={onToggleAdd} onDelete={onDelete} onRename={onRename} addingToParent={addingToParent} newChildName={newChildName} setNewChildName={setNewChildName} onConfirmAdd={onConfirmAdd} busy={busy}/>)}
      {isAddingHere&&<div className="pb-add-child" style={{paddingLeft:(depth+1)*20+8}}>
        <input autoFocus value={newChildName} onChange={e=>setNewChildName(e.target.value)} placeholder="Sub-ruta…" onKeyDown={e=>{if(e.key==='Enter')onConfirmAdd();if(e.key==='Escape')setNewChildName('')}}/>
        <button className="icon-button" onClick={onConfirmAdd} disabled={busy||!newChildName.trim()}>{busy?<LoaderCircle size={13} className="spin"/>:<Check size={14}/>}</button>
      </div>}
    </div>}
  </div>;
}

/* ================= Route Config Panel ================= */
function RouteConfig({route,tables,forms,views,onSave,onClose}:{route:BuilderRoute;tables:string[];forms:BuilderForm[];views:BuilderView[];onSave:(id:number,data:Partial<BuilderRoute>)=>Promise<void>;onClose:()=>void}){
  const [form,setForm] = useState({name:route.name,slug:route.slug,icon:route.icon||'',content_type:route.content_type,layout:route.layout,active:route.active,visible_in_menu:route.visible_in_menu,badge_color:route.badge_color||'',badge_label:route.badge_label||'',content_config:route.content_config||{}});
  const [components,setComponents] = useState<PageComponent[]>((route.content_config?.components as PageComponent[])||[]);
  const [busy,setBusy] = useState(false);
  const [activeTab,setActiveTab] = useState<'config'|'components'>('config');

  function updateConfig(key:string,value:unknown){ setForm(f=>({...f,content_config:{...f.content_config,[key]:value}})); }

  async function handleSave(){ setBusy(true); try{ await onSave(route.id,{...form,content_config:{...form.content_config,components}}); onClose(); }finally{ setBusy(false); } }

  const contentTypes = [{v:'empty',l:'Vacía',icon:Layout},{v:'table',l:'Tabla CRUD',icon:Table2},{v:'form',l:'Formulario',icon:FormInput},{v:'chart',l:'Gráfica',icon:BarChart3},{v:'page',l:'Página custom',icon:FileText},{v:'redirect',l:'Redirect',icon:ArrowRight},{v:'divider',l:'Divisor',icon:Layout}];
  const layouts = [{v:'default',l:'Default'},{v:'sidebar',l:'Sidebar'},{v:'tabs',l:'Tabs'},{v:'fullwidth',l:'Full Width'},{v:'card',l:'Card'}];

  return <div className="route-config-panel">
    <div className="rcp-header"><h3>Configurar: {route.name}</h3><button className="icon-button" onClick={onClose} title="Cerrar"><X size={16}/></button></div>

    <div className="rcp-body">
      <div className="rcp-tabs">
        <button className={`rcp-tab ${activeTab==='config'?'active':''}`} onClick={()=>setActiveTab('config')}>Configuración</button>
        <button className={`rcp-tab ${activeTab==='components'?'active':''}`} onClick={()=>setActiveTab('components')}>Componentes <span className="rcp-tab-count">{components.length}</span></button>
      </div>

      {activeTab==='config'&&<>
      <label className="control"><span>Nombre</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label className="control"><span>Slug</span><input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})}/></label>

      <div className="control"><span>Tipo de contenido</span>
        <div className="rcp-type-grid">
          {contentTypes.map(ct=><button key={ct.v} className={`rcp-type-btn ${form.content_type===ct.v?'active':''}`} onClick={()=>setForm({...form,content_type:ct.v as BuilderRoute['content_type']})}>
            <ct.icon size={18}/><span>{ct.l}</span>
          </button>)}
        </div>
      </div>

      {form.content_type==='table'&&<div className="rcp-config-section">
        <label className="control"><span>Vista de tabla creada</span><select value={String(form.content_config.view_id??'')} onChange={e=>updateConfig('view_id',Number(e.target.value)||null)}>
          <option value="">Seleccionar vista…</option>
          {views.map(view=><option key={view.id} value={view.id}>{view.name} · {view.view_key}</option>)}
        </select></label>
        <p className="rcp-resource-note">Usará columnas, buscador, identificador y acciones configuradas en el creador de vistas.</p>
      </div>}

      {form.content_type==='form'&&<div className="rcp-config-section">
        <label className="control"><span>Formulario creado</span><select value={String(form.content_config.form_id??'')} onChange={e=>updateConfig('form_id',Number(e.target.value)||null)}>
          <option value="">Seleccionar formulario…</option>
          {forms.map(item=><option key={item.id} value={item.id}>{item.name} · {item.form_key}</option>)}
        </select></label>
        <p className="rcp-resource-note">Usará el grid, campos, relaciones y validaciones del formulario guardado.</p>
      </div>}

      {form.content_type==='chart'&&<div className="rcp-config-section">
        <label className="control"><span>ID de gráfica</span><input type="number" value={(form.content_config.chart_id as number)||''} onChange={e=>updateConfig('chart_id',Number(e.target.value))}/></label>
      </div>}

      {form.content_type==='redirect'&&<div className="rcp-config-section">
        <label className="control"><span>URL de destino</span><input value={(form.content_config.target_url as string)||''} onChange={e=>updateConfig('target_url',e.target.value)} placeholder="/dashboard"/></label>
      </div>}

      <div className="control"><span>Layout de página</span>
        <div className="rcp-layout-row">
          {layouts.map(l=><button key={l.v} className={`rcp-layout-btn ${form.layout===l.v?'active':''}`} onClick={()=>setForm({...form,layout:l.v as BuilderRoute['layout']})}>{l.l}</button>)}
        </div>
      </div>

      <label className="control"><span>Ícono</span><input value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})} placeholder="house, users, etc."/></label>

      <div className="rcp-toggles">
        <label className="check"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/><span>Activa</span></label>
        <label className="check"><input type="checkbox" checked={form.visible_in_menu} onChange={e=>setForm({...form,visible_in_menu:e.target.checked})}/><span>Visible en menú</span></label>
      </div>

      <div className="rcp-badge-row">
        <label className="control"><span>Badge label</span><input value={form.badge_label} onChange={e=>setForm({...form,badge_label:e.target.value})} placeholder="Nuevo"/></label>
        <label className="control"><span>Badge color</span><input type="color" value={form.badge_color||'#6366f1'} onChange={e=>setForm({...form,badge_color:e.target.value})}/></label>
      </div>
      </>}

      {activeTab==='components'&&<div className="rcp-components-tab">
        <ComponentDropZone components={components} tables={tables} forms={forms} views={views} onChange={setComponents}/>
      </div>}
    </div>

    <div className="rcp-footer">
      <button className="button ghost" onClick={onClose}>Cancelar</button>
      <button className="button primary" onClick={()=>void handleSave()} disabled={busy}>{busy?<LoaderCircle className="spin" size={15}/>:<><Check size={15}/>Guardar y cerrar</>}</button>
    </div>
  </div>;
}

/* ================= Project Preview ================= */
function ProjectPreview({routes,paths,forms,views}:{routes:BuilderRoute[];paths:Record<number,string>;forms:BuilderForm[];views:BuilderView[]}){
  const [activePath,setActivePath] = useState('/');

  useEffect(()=>{
    if(activePath!=='/'&&Object.values(paths).includes(activePath))return;
    const first=findFirstVisibleRoute(routes);
    if(first)setActivePath(paths[first.id]||'/');
  },[routes,paths,activePath]);

  function buildNav(items:BuilderRoute[],depth=0):React.ReactNode{
    return <ul className="preview-nav-list" style={{paddingLeft:depth*16}}>
      {items.filter(r=>r.visible_in_menu&&r.active).map(r=><li key={r.id}>
        <button className={`preview-nav-item ${activePath===paths[r.id]?'active':''}`} onClick={()=>setActivePath(paths[r.id]||'/')}>
          {r.name}{r.badge_label&&<span className="preview-badge" style={{background:r.badge_color||'#6366f1'}}>{r.badge_label}</span>}
        </button>
        {r.children&&r.children.length>0&&buildNav(r.children,depth+1)}
      </li>)}
    </ul>;
  }

  function renderContent(){
    const findRoute = (items:BuilderRoute[]):BuilderRoute|null=>{
      for(const r of items){ if(paths[r.id]===activePath) return r; if(r.children){ const found=findRoute(r.children); if(found)return found; } } return null;
    };
    const route = findRoute(routes);
    if(!route) return <div className="preview-empty"><Layout size={48}/><p>Selecciona una ruta del menú</p></div>;

    const comps = (route.content_config?.components as PageComponent[])||[];
    if(comps.length>0) return <div className="preview-content"><h2>{route.name}</h2>{renderComponents(comps,forms,views)}</div>;

    switch(route.content_type){
      case 'table': return <div className="preview-content"><h2>{route.name}</h2>{renderComponents([{id:`route-view-${route.id}`,type:'table',label:route.name,config:{view_id:route.content_config?.view_id,show_title:false}}],forms,views)}</div>;
      case 'form': return <div className="preview-content"><h2>{route.name}</h2>{renderComponents([{id:`route-form-${route.id}`,type:'form',label:route.name,config:{form_id:route.content_config?.form_id,show_title:false}}],forms,views)}</div>;
      case 'chart': return <div className="preview-content"><h2>{route.name}</h2><p className="muted">Gráfica #{(route.content_config?.chart_id as string)||'—'}</p><div className="preview-chart-placeholder"><BarChart3 size={32}/><p>Vista previa de gráfica</p></div></div>;
      case 'page': return <div className="preview-content"><h2>{route.name}</h2><div className="preview-page-placeholder"><FileText size={32}/><p>Página personalizada</p></div></div>;
      case 'redirect': return <div className="preview-content"><h2>{route.name}</h2><p className="muted">Redirect → <code>{(route.content_config?.target_url as string)||'—'}</code></p></div>;
      case 'divider': return <hr className="preview-divider"/>;
      default: return <div className="preview-content preview-empty-state"><Layout size={48}/><h2>{route.name}</h2><p>Página vacía — configura el contenido en el panel de edición</p></div>;
    }
  }

  return <div className="project-preview">
    <div className="preview-chrome">
      <div className="preview-browser-bar"><span className="dot red"/><span className="dot yellow"/><span className="dot green"/><span className="preview-url">localhost:5173{activePath}</span></div>
      <div className="preview-body">
        <div className="preview-sidebar">{buildNav(routes)}</div>
        <div className="preview-main">{renderContent()}</div>
      </div>
    </div>
  </div>;
}

/* ================= Main ProjectBuilder ================= */
export default function ProjectBuilder(){
  const [routes,setRoutes] = useState<BuilderRoute[]>([]);
  const [flatRoutes,setFlatRoutes] = useState<BuilderRoute[]>([]);
  const [selected,setSelected] = useState<BuilderRoute|null>(null);
  const [tables,setTables] = useState<string[]>([]);
  const [forms,setForms] = useState<BuilderForm[]>([]);
  const [views,setViews] = useState<BuilderView[]>([]);
  const [showPreview,setShowPreview] = useState(false);
  const [busy,setBusy] = useState(false);
  const [showConfig,setShowConfig] = useState(false);
  const [newRouteName,setNewRouteName] = useState('');
  const [addingToParent,setAddingToParent] = useState<number|null>(null);
  const [newChildName,setNewChildName] = useState('');

  const load = useCallback(async()=>{
    const [tree,flat,tbls,savedForms,savedViews] = await Promise.all([api.routes(),api.routesFlat(),api.schemaTables(),api.forms(),api.views()]);
    setRoutes(tree.routes); setFlatRoutes(flat.routes); setTables(tbls.tables.map(t=>t.name)); setForms(savedForms); setViews(savedViews);
  },[]);

  useEffect(()=>{ void load(); },[load]);

  async function addRoot(){ if(!newRouteName.trim())return; setBusy(true);
    try{ await api.createRoute({name:newRouteName.trim(),content_type:'empty'}); setNewRouteName(''); await load(); }finally{ setBusy(false); } }

  async function addChild(parentId:number){ if(!newChildName.trim())return; setBusy(true);
    try{ await api.createRoute({name:newChildName.trim(),parent_id:parentId,content_type:'empty'}); setNewChildName(''); setAddingToParent(null); await load(); }finally{ setBusy(false); } }

  function handleAddChild(parentId:number){
    if(addingToParent===parentId){setAddingToParent(null);setNewChildName('');}
    else{setAddingToParent(parentId);setNewChildName('');}
  }

  async function deleteRoute(id:number){ if(!confirm('¿Eliminar esta ruta y sus hijos?'))return; setBusy(true);
    try{ await api.deleteRoute(id); if(selected?.id===id){setSelected(null);setShowConfig(false);} await load(); }finally{ setBusy(false); } }

  async function renameRoute(id:number,name:string){ setBusy(true);
    try{ await api.updateRoute(id,{name}); await load(); }finally{ setBusy(false); } }

  async function saveRoute(id:number,data:Partial<BuilderRoute>){ await api.updateRoute(id,data); await load(); setSelected(prev=>prev&&prev.id===id?{...prev,...data}:prev); }

  return <div className="project-builder">
    <div className="pb-left">
      <div className="pb-header">
        <h2>Constructor de Proyectos</h2>
        <div className="pb-header-actions">
          <button className="icon-button" title="Preview" onClick={()=>setShowPreview(!showPreview)}>{showPreview?<EyeOff size={16}/>:<Eye size={16}/>}</button>
        </div>
      </div>
      <div className="pb-new-route">
        <input value={newRouteName} onChange={e=>setNewRouteName(e.target.value)} placeholder="Nombre de la ruta…" onKeyDown={e=>{if(e.key==='Enter')void addRoot();}}/>
        <button className="button primary small" onClick={()=>void addRoot()} disabled={busy||!newRouteName.trim()}><Plus size={15}/></button>
      </div>
      <div className="pb-tree">
        {routes.length===0&&!newRouteName&&<div className="pb-empty"><Layout size={40}/><p>No hay rutas creadas</p><small>Escribe un nombre y presiona Enter</small></div>}
        {routes.map(r=><RouteNode key={r.id} route={r} depth={0} selectedId={selected?.id??null} onSelect={r=>{setSelected(r);setShowConfig(true);}} onToggleAdd={handleAddChild} onDelete={deleteRoute} onRename={renameRoute} addingToParent={addingToParent} newChildName={newChildName} setNewChildName={setNewChildName} onConfirmAdd={()=>void addChild(addingToParent!)} busy={busy}/>)}
      </div>
      <div className="pb-palette-section">
        <ComponentPalette/>
      </div>
      <div className="pb-stats"><span>{flatRoutes.length} rutas</span><span>·</span><span>{tables.length} tablas</span></div>
    </div>
    <div className="pb-right">
      {showConfig&&selected?<RouteConfig route={selected} tables={tables} forms={forms} views={views} onSave={saveRoute} onClose={()=>{setShowConfig(false);setSelected(null);}}/>
        :showPreview?<ProjectPreview routes={routes} paths={buildRoutePaths(flatRoutes)} forms={forms} views={views}/>
        :<div className="pb-placeholder"><Layout size={48}/><h2>Constructor de Proyectos</h2><p>Selecciona una ruta del árbol para configurarla, o activa el preview para ver tu proyecto</p></div>}
    </div>
  </div>;
}

function buildRoutePaths(routes:BuilderRoute[]){
  const byId=new Map(routes.map(route=>[route.id,route])); const paths:Record<number,string>={};
  routes.forEach(route=>{const parts=[route.slug];let parent=route.parent_id?byId.get(route.parent_id):undefined;const visited=new Set<number>([route.id]);while(parent&&!visited.has(parent.id)){visited.add(parent.id);parts.unshift(parent.slug);parent=parent.parent_id?byId.get(parent.parent_id):undefined;}paths[route.id]=`/${parts.join('/')}`;});
  return paths;
}

function findFirstVisibleRoute(routes:BuilderRoute[]):BuilderRoute|undefined{
  for(const route of routes){if(route.active&&route.visible_in_menu)return route;const child=findFirstVisibleRoute(route.children??[]);if(child)return child;}
}

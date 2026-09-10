import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Table2, FormInput, BarChart3, FileText, ArrowRight, Layout, Columns3, Rows3, Maximize2, CreditCard, LoaderCircle, Copy, Check, X } from 'lucide-react';
import { api } from '../api/client';
import type { BuilderRoute } from '../types';
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
function RouteConfig({route,tables,onSave,onClose}:{route:BuilderRoute;tables:string[];onSave:(id:number,data:Partial<BuilderRoute>)=>Promise<void>;onClose:()=>void}){
  const [form,setForm] = useState({name:route.name,slug:route.slug,icon:route.icon||'',content_type:route.content_type,layout:route.layout,active:route.active,visible_in_menu:route.visible_in_menu,badge_color:route.badge_color||'',badge_label:route.badge_label||'',content_config:route.content_config||{}});
  const [components,setComponents] = useState<PageComponent[]>((route.content_config?.components as PageComponent[])||[]);
  const [busy,setBusy] = useState(false);
  const [saved,setSaved] = useState(false);
  const [activeTab,setActiveTab] = useState<'config'|'components'>('config');

  function updateConfig(key:string,value:unknown){ setForm(f=>({...f,content_config:{...f.content_config,[key]:value}})); }

  async function handleSave(){ setBusy(true); try{ await onSave(route.id,{...form,content_config:{...form.content_config,components}}); setSaved(true); setTimeout(()=>setSaved(false),1500); }finally{ setBusy(false); } }

  const contentTypes = [{v:'empty',l:'Vacía',icon:Layout},{v:'table',l:'Tabla CRUD',icon:Table2},{v:'form',l:'Formulario',icon:FormInput},{v:'chart',l:'Gráfica',icon:BarChart3},{v:'page',l:'Página custom',icon:FileText},{v:'redirect',l:'Redirect',icon:ArrowRight},{v:'divider',l:'Divisor',icon:Layout}];
  const layouts = [{v:'default',l:'Default'},{v:'sidebar',l:'Sidebar'},{v:'tabs',l:'Tabs'},{v:'fullwidth',l:'Full Width'},{v:'card',l:'Card'}];

  return <div className="route-config-panel">
    <div className="rcp-header"><h3>Configurar: {route.name}</h3><button className="icon-button" onClick={onClose}><Trash2 size={16}/></button></div>

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
        <label className="control"><span>Tabla</span><select value={(form.content_config.table_name as string)||''} onChange={e=>updateConfig('table_name',e.target.value)}>
          <option value="">Seleccionar…</option>
          {tables.map(t=><option key={t} value={t}>{t}</option>)}
        </select></label>
        <label className="control"><span>Columnas visibles (separadas por coma)</span><input value={(form.content_config.visible_columns as string)||''} onChange={e=>updateConfig('visible_columns',e.target.value)} placeholder="*"/></label>
        <label className="control"><span>Filtro por defecto</span><input value={(form.content_config.default_filter as string)||''} onChange={e=>updateConfig('default_filter',e.target.value)} placeholder="activo = 1"/></label>
        <label className="control"><span>Orden por defecto</span><input value={(form.content_config.default_sort as string)||''} onChange={e=>updateConfig('default_sort',e.target.value)} placeholder="created_at desc"/></label>
        <label className="check"><input type="checkbox" checked={!!form.content_config.allow_create} onChange={e=>updateConfig('allow_create',e.target.checked)}/><span>Permitir crear registros</span></label>
        <label className="check"><input type="checkbox" checked={!!form.content_config.allow_edit} onChange={e=>updateConfig('allow_edit',e.target.checked)}/><span>Permitir editar registros</span></label>
        <label className="check"><input type="checkbox" checked={!!form.content_config.allow_delete} onChange={e=>updateConfig('allow_delete',e.target.checked)}/><span>Permitir eliminar registros</span></label>
      </div>}

      {form.content_type==='form'&&<div className="rcp-config-section">
        <label className="control"><span>Tabla destino</span><select value={(form.content_config.table_name as string)||''} onChange={e=>updateConfig('table_name',e.target.value)}>
          <option value="">Seleccionar…</option>
          {tables.map(t=><option key={t} value={t}>{t}</option>)}
        </select></label>
        <label className="control"><span>Campos visibles (separados por coma)</span><input value={(form.content_config.fields as string)||''} onChange={e=>updateConfig('fields',e.target.value)} placeholder="*"/></label>
        <label className="control"><span>Layout</span><select value={(form.content_config.form_layout as string)||'vertical'} onChange={e=>updateConfig('form_layout',e.target.value)}>
          <option value="vertical">Vertical</option><option value="horizontal">Horizontal</option><option value="grid">Grid 2 columnas</option>
        </select></label>
        <label className="check"><input type="checkbox" checked={!!form.content_config.show_success_page} onChange={e=>updateConfig('show_success_page',e.target.checked)}/><span>Mostrar página de éxito</span></label>
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
        <ComponentDropZone components={components} tables={tables} onChange={setComponents}/>
      </div>}
    </div>

    <div className="rcp-footer">
      <button className="button ghost" onClick={onClose}>Cancelar</button>
      <button className="button primary" onClick={()=>void handleSave()} disabled={busy||saved}>{saved?<><Check size={15}/>Guardado</>:busy?<LoaderCircle className="spin" size={15}/>:<><Pencil size={15}/>Guardar</>}</button>
    </div>
  </div>;
}

/* ================= Project Preview ================= */
function ProjectPreview({routes,paths}:{routes:BuilderRoute[];paths:Record<number,string>}){
  const [activePath,setActivePath] = useState('/');

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
    if(comps.length>0) return <div className="preview-content"><h2>{route.name}</h2>{renderComponents(comps)}</div>;

    switch(route.content_type){
      case 'table': return <div className="preview-content"><h2>{route.name}</h2><p className="muted">Tabla: <code>{(route.content_config?.table_name as string)||'—'}</code></p><div className="preview-table-placeholder"><Table2 size={32}/><p>Vista previa de tabla CRUD</p></div></div>;
      case 'form': return <div className="preview-content"><h2>{route.name}</h2><p className="muted">Formulario → <code>{(route.content_config?.table_name as string)||'—'}</code></p><div className="preview-form-placeholder"><FormInput size={32}/><p>Vista previa de formulario</p></div></div>;
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
  const [showPreview,setShowPreview] = useState(false);
  const [busy,setBusy] = useState(false);
  const [showConfig,setShowConfig] = useState(false);
  const [newRouteName,setNewRouteName] = useState('');
  const [addingToParent,setAddingToParent] = useState<number|null>(null);
  const [newChildName,setNewChildName] = useState('');

  const load = useCallback(async()=>{
    const [tree,flat,tbls] = await Promise.all([api.routes(),api.routesFlat(),api.schemaTables()]);
    setRoutes(tree.routes); setFlatRoutes(flat.routes); setTables(tbls.tables.map(t=>t.name));
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
      {showConfig&&selected?<RouteConfig route={selected} tables={tables} onSave={saveRoute} onClose={()=>{setShowConfig(false);setSelected(null);}}/>
        :showPreview?<ProjectPreview routes={routes} paths={flatRoutes.reduce((acc,r)=>({...acc,[r.id]:`/${r.slug}`}),{} as Record<number,string>)}/>
        :<div className="pb-placeholder"><Layout size={48}/><h2>Constructor de Proyectos</h2><p>Selecciona una ruta del árbol para configurarla, o activa el preview para ver tu proyecto</p></div>}
    </div>
  </div>;
}

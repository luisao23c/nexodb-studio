import { createContext, useContext, useEffect, useState } from 'react';
import { GripVertical, Plus, Trash2, Copy, ChevronDown, ChevronRight, Table2, FormInput, BarChart3, Type, Image, MousePointerClick, Minus, Code2, LayoutList, Columns3, Rows3, CreditCard, ListOrdered, FileText, Star, AlertTriangle, X, Layers, Search, LoaderCircle, Play, PanelTop, Gauge, Workflow, Quote, Images, ListChecks, Clock3, PanelsTopLeft } from 'lucide-react';
import { api } from '../api/client';
import type { BuilderForm, BuilderFormField, BuilderRoute, BuilderView, BuilderViewColumn } from '../types';

export interface PageComponent {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
}

type DropZoneProps = {components:PageComponent[];tables:string[];forms:BuilderForm[];views:BuilderView[];routes?:BuilderRoute[];onChange:(comps:PageComponent[])=>void;depth?:number;label?:string;zoneId?:string;ancestorIds?:string[]};
const CanvasMoveContext=createContext<null|{move:(componentId:string,targetZone:string,ancestorIds:string[])=>void}>(null);

type TabConfig = {id:string;label:string;components:PageComponent[]};

const COMPONENT_DEFS: {type:string;label:string;icon:typeof Table2;category:string;color:string;defaultConfig:Record<string,unknown>}[] = [
  {type:'form',label:'Formulario creado',icon:FormInput,category:'Datos',color:'#6366f1',defaultConfig:{form_id:null,show_title:true,title:''}},
  {type:'table',label:'Vista creada',icon:Table2,category:'Datos',color:'#0ea5e9',defaultConfig:{view_id:null,show_title:true,title:''}},
  {type:'chart',label:'Gráfica',icon:BarChart3,category:'Datos',color:'#f59e0b',defaultConfig:{chart_id:null,show_title:true,title:'Gráfica'}},
  {type:'list',label:'Lista dinámica',icon:ListOrdered,category:'Datos',color:'#10b981',defaultConfig:{table_name:'',display_field:'',show_title:true,title:'Lista',limit:6}},
  {type:'tabs',label:'Tabs',icon:LayoutList,category:'Layout',color:'#8b5cf6',defaultConfig:{tabs:[{id:'tab_1',label:'Pestaña 1',components:[]},{id:'tab_2',label:'Pestaña 2',components:[]}]}},
  {type:'columns',label:'Columnas',icon:Columns3,category:'Layout',color:'#14b8a6',defaultConfig:{columns:2,gap:16,children:[[],[]]}},
  {type:'card',label:'Card',icon:CreditCard,category:'Layout',color:'#ec4899',defaultConfig:{title:'',subtitle:'',bordered:true,children:[]}},
  {type:'section',label:'Sección',icon:PanelTop,category:'Layout',color:'#7c3aed',defaultConfig:{title:'Nueva sección',subtitle:'',tone:'plain',padding:24,children:[]}},
  {type:'hero',label:'Portada / Hero',icon:Star,category:'Contenido',color:'#7c3aed',defaultConfig:{eyebrow:'Bienvenido',title:'Construye algo extraordinario',description:'Presenta el objetivo principal de esta página.',align:'left',background:'#f5f3ff'}},
  {type:'metric',label:'Indicador KPI',icon:Gauge,category:'Contenido',color:'#0891b2',defaultConfig:{label:'Indicador',value:'0',helper:'Actualizado ahora',color:'#6366f1'}},
  {type:'accordion',label:'Acordeón',icon:ChevronDown,category:'Contenido',color:'#0f766e',defaultConfig:{items:[{title:'Pregunta o sección',content:'Agrega aquí la información.'}]}},
  {type:'video',label:'Video',icon:Play,category:'Contenido',color:'#dc2626',defaultConfig:{src:'',title:'Video',ratio:'16/9'}},
  {type:'progress',label:'Progreso',icon:Rows3,category:'Contenido',color:'#16a34a',defaultConfig:{label:'Progreso',value:65,color:'#22c55e'}},
  {type:'quote',label:'Testimonio / Cita',icon:Quote,category:'Contenido',color:'#9333ea',defaultConfig:{quote:'Una experiencia que vale la pena compartir.',author:'Nombre de la persona',role:'Cargo o referencia'}},
  {type:'gallery',label:'Galería',icon:Images,category:'Contenido',color:'#ea580c',defaultConfig:{images:['https://placehold.co/800x500?text=Imagen+1','https://placehold.co/800x500?text=Imagen+2'],columns:2,rounded:true}},
  {type:'checklist',label:'Lista de beneficios',icon:ListChecks,category:'Contenido',color:'#059669',defaultConfig:{title:'Características',items:['Primer beneficio','Segundo beneficio','Tercer beneficio'],color:'#22c55e'}},
  {type:'timeline',label:'Línea de tiempo',icon:Clock3,category:'Contenido',color:'#2563eb',defaultConfig:{items:[{title:'Primer paso',description:'Describe este momento.'},{title:'Siguiente paso',description:'Continúa el proceso.'}]}},
  {type:'embed',label:'Contenido embebido',icon:PanelsTopLeft,category:'Contenido',color:'#475569',defaultConfig:{url:'',title:'Contenido externo',height:360}},
  {type:'text',label:'Texto',icon:Type,category:'Contenido',color:'#475569',defaultConfig:{content:'Escribe aquí tu texto...',align:'left',size:'base'}},
  {type:'heading',label:'Título',icon:FileText,category:'Contenido',color:'#1e293b',defaultConfig:{text:'Título',level:'h2'}},
  {type:'image',label:'Imagen',icon:Image,category:'Contenido',color:'#f97316',defaultConfig:{src:'',alt:'',width:'100%'}},
  {type:'button',label:'Botón / Modal',icon:MousePointerClick,category:'Contenido',color:'#6366f1',defaultConfig:{label:'Abrir',variant:'primary',action:'modal',url:'',modal_title:'',modal_components:[]}},
  {type:'divider',label:'Divisor',icon:Minus,category:'Contenido',color:'#94a3b8',defaultConfig:{style:'solid'}},
  {type:'spacer',label:'Espaciador',icon:Rows3,category:'Contenido',color:'#cbd5e1',defaultConfig:{height:24}},
  {type:'code',label:'Código',icon:Code2,category:'Contenido',color:'#10b981',defaultConfig:{code:'// código aquí',language:'javascript'}},
  {type:'alert',label:'Alerta',icon:AlertTriangle,category:'Contenido',color:'#eab308',defaultConfig:{message:'Mensaje de alerta',type:'info'}},
  {type:'badge',label:'Badge',icon:Star,category:'Contenido',color:'#6366f1',defaultConfig:{label:'Etiqueta',color:'#6366f1'}},
  {type:'table_detail',label:'Detalle Tabla',icon:Table2,category:'Datos',color:'#0ea5e9',defaultConfig:{table_name:'',show_header:true}},
];

const CATEGORIES = ['Datos','Layout','Contenido'];

let _id = 0;
function genId(){ return `comp_${Date.now()}_${++_id}`; }

function deepClone<T>(obj:T):T{ return JSON.parse(JSON.stringify(obj)); }

/* ================= Component Palette (Drag Source) ================= */
export function ComponentPalette(){
  const [openCat,setOpenCat] = useState<string|null>('Datos');
  const [query,setQuery]=useState('');

  function onDragStart(e:React.DragEvent,type:string){
    e.dataTransfer.setData('component-type',type);
    e.dataTransfer.effectAllowed='copy';
  }

  const visible=COMPONENT_DEFS.filter(def=>!query||def.label.toLowerCase().includes(query.toLowerCase())||def.category.toLowerCase().includes(query.toLowerCase()));
  function add(type:string){window.dispatchEvent(new CustomEvent('nexodb:add-component',{detail:{type}}));}

  return <div className="cp-palette">
    <div className="cp-palette-header"><Layers size={14}/><strong>Bloques</strong><small>Arrastra o haz clic</small></div>
    <label className="cp-search"><Search size={13}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar bloque…"/></label>
    {CATEGORIES.map(cat=>visible.some(def=>def.category===cat)&&<div key={cat} className="cp-cat">
      <button className="cp-cat-header" onClick={()=>setOpenCat(openCat===cat?null:cat)}>
        {openCat===cat?<ChevronDown size={13}/>:<ChevronRight size={13}/>}
        <span>{cat}</span>
        <small>{visible.filter(d=>d.category===cat).length}</small>
      </button>
      {openCat===cat&&<div className="cp-cat-items">
        {visible.filter(d=>d.category===cat).map(def=><button type="button" key={def.type} className="cp-item" draggable onDragStart={e=>onDragStart(e,def.type)} onClick={()=>add(def.type)} title={`${def.label}: clic para agregar o arrastra`}>
          <div className="cp-item-icon" style={{background:def.color+'15',color:def.color}}><def.icon size={15}/></div>
          <span>{def.label}</span>
        </button>)}
      </div>}
    </div>)}
  </div>;
}

/* ================= Drop Zone ================= */
export function ComponentDropZone(props:DropZoneProps){
  const parentContext=useContext(CanvasMoveContext);
  useEffect(()=>{if(parentContext)return;const handler=(event:Event)=>{const type=(event as CustomEvent<{type:string}>).detail?.type;const def=COMPONENT_DEFS.find(item=>item.type===type);if(def)props.onChange([...props.components,{id:genId(),type:def.type,label:def.label,config:deepClone(def.defaultConfig)}]);};window.addEventListener('nexodb:add-component',handler);return()=>window.removeEventListener('nexodb:add-component',handler);},[parentContext,props]);
  if(parentContext)return <ComponentDropZoneInner {...props}/>;
  const move=(componentId:string,targetZone:string,ancestorIds:string[])=>{if(ancestorIds.includes(componentId))return;const moving=findComponent(props.components,componentId);if(!moving)return;props.onChange(insertIntoZone(removeComponent(props.components,componentId),targetZone,moving));};
  return <CanvasMoveContext.Provider value={{move}}><ComponentDropZoneInner {...props} zoneId="root" ancestorIds={[]}/></CanvasMoveContext.Provider>;
}

function ComponentDropZoneInner({components,tables,forms,views,routes=[],onChange,depth=0,label='Canvas de la página',zoneId='root',ancestorIds=[]}:DropZoneProps){
  const canvas=useContext(CanvasMoveContext);
  const [dragOver,setDragOver] = useState(false);
  const [editingId,setEditingId] = useState<string|null>(null);

  function onDrop(e:React.DragEvent){
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const movingId=e.dataTransfer.getData('existing-component-id');
    if(movingId){canvas?.move(movingId,zoneId,ancestorIds);e.dataTransfer.dropEffect='move';return;}
    const type = e.dataTransfer.getData('component-type');
    if(!type) return;
    const def = COMPONENT_DEFS.find(d=>d.type===type);
    if(!def) return;
    const newComp:PageComponent = {id:genId(),type:def.type,label:def.label,config:deepClone(def.defaultConfig)};
    onChange([...components,newComp]);
    setEditingId(newComp.id);
  }

  function updateComp(id:string,patch:Partial<PageComponent>){
    onChange(components.map(c=>c.id===id?{...c,...patch}:c));
  }

  function updateConfig(id:string,key:string,value:unknown){
    onChange(components.map(c=>c.id===id?{...c,config:{...c.config,[key]:value}}:c));
  }

  function removeComp(id:string){ onChange(components.filter(c=>c.id!==id)); if(editingId===id) setEditingId(null); }

  function moveComp(id:string,dir:-1|1){
    const i = components.findIndex(c=>c.id===id);
    const j = i+dir;
    if(j<0||j>=components.length) return;
    const arr=[...components]; [arr[i],arr[j]]=[arr[j],arr[i]]; onChange(arr);
  }

  function duplicateComp(id:string){
    const comp = components.find(c=>c.id===id);
    if(!comp) return;
    const clone = {...deepClone(comp),id:genId(),label:comp.label+' (copia)'};
    const i = components.findIndex(c=>c.id===id);
    const arr=[...components]; arr.splice(i+1,0,clone); onChange(arr);
  }

  return <div className={`cdz-container ${depth>0?'nested':''}`}>
    {depth>0&&<div className="cdz-zone-label"><span>{label}</span><small>Nivel {depth}</small></div>}
    <div className={`cdz-dropzone ${dragOver?'drag-over':''} ${components.length===0?'empty':''}`}
      onDragOver={e=>{e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='copy';setDragOver(true);}}
      onDragLeave={e=>{if(e.currentTarget===e.target)setDragOver(false);}}
      onDrop={onDrop}>
      {components.length===0&&<div className="cdz-empty"><LayoutList size={depth?22:32}/><p>Arrastra cualquier componente aquí</p><small>{depth?'Este contenedor funciona como otro canvas':'Construye la página desde la paleta lateral'}</small></div>}
      {components.map((comp,i)=>{
        const def = COMPONENT_DEFS.find(d=>d.type===comp.type);
        const Icon = def?.icon??FileText;
        const isEditing = editingId===comp.id;
        return <div key={comp.id} className={`cdz-comp ${isEditing?'editing':''}`}>
          <div className="cdz-comp-header" draggable onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData('existing-component-id',comp.id);e.dataTransfer.effectAllowed='move';}} onClick={()=>setEditingId(isEditing?null:comp.id)}>
            <span className="cdz-drag-handle" onClick={e=>e.stopPropagation()}><GripVertical size={14}/></span>
            <div className="cdz-comp-icon" style={{background:def?.color+'15',color:def?.color}}><Icon size={14}/></div>
            <span className="cdz-comp-label">{comp.label}</span>
            <span className={`cdz-comp-type ${comp.type==='button'?'flow':''}`}>{comp.type==='button'?buttonActionLabel(String(comp.config.action||'none')):def?.label}</span>
            <code className="cdz-comp-id" title="Identificador para flujos">{comp.id}</code>
            <div className="cdz-comp-actions" onClick={e=>e.stopPropagation()}>
              <button onClick={()=>moveComp(comp.id,-1)} disabled={i===0} title="Subir"><ChevronDown size={12} style={{transform:'rotate(180deg)'}}/></button>
              <button onClick={()=>moveComp(comp.id,1)} disabled={i===components.length-1} title="Bajar"><ChevronDown size={12}/></button>
              <button onClick={()=>duplicateComp(comp.id)} title="Duplicar"><Copy size={12}/></button>
              <button className="danger" onClick={()=>removeComp(comp.id)} title="Eliminar"><Trash2 size={12}/></button>
            </div>
          </div>
          {isEditing&&<div className="cdz-comp-config">
            <ComponentEditor comp={comp} tables={tables} forms={forms} views={views} routes={routes} onUpdate={(patch)=>updateComp(comp.id,patch)} onUpdateConfig={(k,v)=>updateConfig(comp.id,k,v)}/>
          </div>}
          {isEditing&&<NestedComponentCanvas comp={comp} tables={tables} forms={forms} views={views} routes={routes} depth={depth+1} ancestorIds={[...ancestorIds,comp.id]} onUpdateConfig={(key,value)=>updateConfig(comp.id,key,value)}/>}
        </div>;
      })}
    </div>
    {dragOver&&<div className="cdz-drop-indicator"><Plus size={16}/> Soltar aquí</div>}
  </div>;
}

function NestedComponentCanvas({comp,tables,forms,views,routes,depth,ancestorIds,onUpdateConfig}:{comp:PageComponent;tables:string[];forms:BuilderForm[];views:BuilderView[];routes:BuilderRoute[];depth:number;ancestorIds:string[];onUpdateConfig:(key:string,value:unknown)=>void}){
  const [activeTab,setActiveTab]=useState(0);
  if(comp.type==='tabs'){
    const tabs=normalizeTabs(comp.config.tabs);
    const active=Math.min(activeTab,Math.max(tabs.length-1,0));
    const tab=tabs[active];
    const updateTabs=(next:TabConfig[])=>onUpdateConfig('tabs',next);
    return <div className="nested-builder tabs-builder">
      <div className="nested-tabs-bar">{tabs.map((item,index)=><button key={item.id} className={index===active?'active':''} onClick={()=>setActiveTab(index)}>{item.label}<small>{item.components.length}</small></button>)}<button className="nested-add" title="Nueva pestaña" onClick={()=>{const next=[...tabs,{id:genId(),label:`Pestaña ${tabs.length+1}`,components:[]}];updateTabs(next);setActiveTab(next.length-1);}}><Plus size={13}/></button></div>
      {tab&&<><div className="nested-tab-tools"><input aria-label="Nombre de la pestaña" value={tab.label} onChange={e=>updateTabs(tabs.map((item,index)=>index===active?{...item,label:e.target.value}:item))}/><button className="danger" disabled={tabs.length===1} onClick={()=>{updateTabs(tabs.filter((_,index)=>index!==active));setActiveTab(Math.max(0,active-1));}}><Trash2 size={13}/> Eliminar pestaña</button></div><ComponentDropZone components={tab.components} tables={tables} forms={forms} views={views} routes={routes} depth={depth} zoneId={`tab:${comp.id}:${tab.id}`} ancestorIds={ancestorIds} label={`Contenido de ${tab.label}`} onChange={children=>updateTabs(tabs.map((item,index)=>index===active?{...item,components:children}:item))}/></>}
    </div>;
  }
  if(comp.type==='columns'){
    const count=Math.max(1,Math.min(12,Number(comp.config.columns)||2)); const existing=(comp.config.children as PageComponent[][]|undefined)??[]; const columns=Array.from({length:count},(_,index)=>existing[index]??[]);
    return <div className="nested-builder columns-builder" style={{gridTemplateColumns:`repeat(${count},minmax(0,1fr))`,gap:Number(comp.config.gap??12)}}>{columns.map((children,index)=><ComponentDropZone key={index} components={children} tables={tables} forms={forms} views={views} routes={routes} depth={depth} zoneId={`column:${comp.id}:${index}`} ancestorIds={ancestorIds} label={`Columna ${index+1}`} onChange={next=>onUpdateConfig('children',columns.map((column,columnIndex)=>columnIndex===index?next:column))}/>)}</div>;
  }
  if(['card','section'].includes(comp.type))return <div className="nested-builder card-builder"><ComponentDropZone components={(comp.config.children as PageComponent[]|undefined)??[]} tables={tables} forms={forms} views={views} routes={routes} depth={depth} zoneId={`${comp.type}:${comp.id}`} ancestorIds={ancestorIds} label={comp.type==='section'?'Contenido de la sección':'Contenido de la tarjeta'} onChange={next=>onUpdateConfig('children',next)}/></div>;
  if(comp.type==='button'&&comp.config.action==='modal')return <div className="nested-builder modal-builder"><div className="nested-builder-head"><span>Canvas del modal</span><small>Todo lo que arrastres aparecerá al abrir el botón</small></div><ComponentDropZone components={(comp.config.modal_components as PageComponent[]|undefined)??[]} tables={tables} forms={forms} views={views} routes={routes} depth={depth} zoneId={`modal:${comp.id}`} ancestorIds={ancestorIds} label="Contenido del modal" onChange={next=>onUpdateConfig('modal_components',next)}/></div>;
  return null;
}

function normalizeTabs(value:unknown):TabConfig[]{
  if(!Array.isArray(value)||value.length===0)return [{id:'tab_1',label:'Pestaña 1',components:[]}];
  return value.map((raw,index)=>{const tab=raw as Record<string,unknown>;let components=Array.isArray(tab.components)?tab.components as PageComponent[]:[];if(!components.length&&tab.resource_id){const type=tab.content_type==='view'?'table':'form';components=[{id:`legacy_${index}_${tab.resource_id}`,type,label:type==='table'?'Vista creada':'Formulario creado',config:type==='table'?{view_id:tab.resource_id,show_title:true}:{form_id:tab.resource_id,show_title:true}}];}return{id:String(tab.id||`tab_${index+1}`),label:String(tab.label||`Pestaña ${index+1}`),components};});
}

function findComponent(components:PageComponent[],id:string):PageComponent|undefined{
  for(const component of components){if(component.id===id)return component;for(const children of componentChildLists(component)){const found=findComponent(children,id);if(found)return found;}}
}

function removeComponent(components:PageComponent[],id:string):PageComponent[]{return components.filter(component=>component.id!==id).map(component=>mapChildLists(component,children=>removeComponent(children,id)));}

function insertIntoZone(components:PageComponent[],zoneId:string,moving:PageComponent):PageComponent[]{
  if(zoneId==='root')return[...components,moving];
  return components.map(component=>{
    if(zoneId===`card:${component.id}`)return{...component,config:{...component.config,children:[...((component.config.children as PageComponent[]|undefined)??[]),moving]}};
    if(zoneId===`section:${component.id}`)return{...component,config:{...component.config,children:[...((component.config.children as PageComponent[]|undefined)??[]),moving]}};
    if(zoneId===`modal:${component.id}`)return{...component,config:{...component.config,modal_components:[...((component.config.modal_components as PageComponent[]|undefined)??[]),moving]}};
    if(zoneId.startsWith(`column:${component.id}:`)){const index=Number(zoneId.split(':').at(-1));const count=Math.min(12,Math.max(Number(component.config.columns)||2,index+1));const columns=Array.from({length:count},(_,columnIndex)=>((component.config.children as PageComponent[][]|undefined)??[])[columnIndex]??[]);columns[index]=[...columns[index],moving];return{...component,config:{...component.config,children:columns}};}
    if(zoneId.startsWith(`tab:${component.id}:`)){const tabId=zoneId.split(':').at(-1);return{...component,config:{...component.config,tabs:normalizeTabs(component.config.tabs).map(tab=>tab.id===tabId?{...tab,components:[...tab.components,moving]}:tab)}};}
    return mapChildLists(component,children=>insertIntoZone(children,zoneId,moving));
  });
}

function componentChildLists(component:PageComponent):PageComponent[][]{if(component.type==='tabs')return normalizeTabs(component.config.tabs).map(tab=>tab.components);if(component.type==='columns')return(component.config.children as PageComponent[][]|undefined)??[];if(['card','section'].includes(component.type))return[(component.config.children as PageComponent[]|undefined)??[]];if(component.type==='button')return[(component.config.modal_components as PageComponent[]|undefined)??[]];return[];}

function mapChildLists(component:PageComponent,map:(children:PageComponent[])=>PageComponent[]):PageComponent{
  if(component.type==='tabs')return{...component,config:{...component.config,tabs:normalizeTabs(component.config.tabs).map(tab=>({...tab,components:map(tab.components)}))}};
  if(component.type==='columns')return{...component,config:{...component.config,children:((component.config.children as PageComponent[][]|undefined)??[]).map(map)}};
  if(component.type==='card')return{...component,config:{...component.config,children:map((component.config.children as PageComponent[]|undefined)??[])}};
  if(component.type==='section')return{...component,config:{...component.config,children:map((component.config.children as PageComponent[]|undefined)??[])}};
  if(component.type==='button')return{...component,config:{...component.config,modal_components:map((component.config.modal_components as PageComponent[]|undefined)??[])}};
  return component;
}

/* ================= Component Editor ================= */
function ComponentEditor({comp,tables,forms,views,routes,onUpdate,onUpdateConfig}:{comp:PageComponent;tables:string[];forms:BuilderForm[];views:BuilderView[];routes:BuilderRoute[];onUpdate:(p:Partial<PageComponent>)=>void;onUpdateConfig:(k:string,v:unknown)=>void}){
  const [charts,setCharts] = useState<{id:number;name:string}[]>([]);

  function loadCharts(){ api.charts().then(r=>setCharts(r.map(c=>({id:c.id,name:c.name})))).catch(()=>{}); }

  return <div className="ce-editor">
    <label className="control"><span>Etiqueta</span><input value={comp.label} onChange={e=>onUpdate({label:e.target.value})}/></label>

    {comp.type==='form'&&<>
      <label className="control"><span>Formulario creado</span><select value={String(comp.config.form_id??'')} onChange={e=>onUpdateConfig('form_id',Number(e.target.value)||null)}>
        <option value="">Seleccionar formulario…</option>{forms.map(form=><option key={form.id} value={form.id}>{form.name} · {form.form_key}</option>)}
      </select></label>
      <label className="check"><input type="checkbox" checked={!!comp.config.show_title} onChange={e=>onUpdateConfig('show_title',e.target.checked)}/><span>Mostrar título</span></label>
      <label className="control"><span>Título</span><input value={(comp.config.title as string)||''} onChange={e=>onUpdateConfig('title',e.target.value)}/></label>
    </>}

    {comp.type==='table'&&<>
      <label className="control"><span>Vista de tabla creada</span><select value={String(comp.config.view_id??'')} onChange={e=>onUpdateConfig('view_id',Number(e.target.value)||null)}>
        <option value="">Seleccionar vista…</option>{views.map(view=><option key={view.id} value={view.id}>{view.name} · {view.view_key}</option>)}
      </select></label>
      <label className="check"><input type="checkbox" checked={!!comp.config.show_title} onChange={e=>onUpdateConfig('show_title',e.target.checked)}/><span>Mostrar título</span></label>
      <label className="control"><span>Título</span><input value={(comp.config.title as string)||''} onChange={e=>onUpdateConfig('title',e.target.value)}/></label>
    </>}

    {comp.type==='chart'&&<>
      <label className="control"><span>Gráfica</span>
        <select value={(comp.config.chart_id as number)||''} onChange={e=>onUpdateConfig('chart_id',Number(e.target.value))} onFocus={loadCharts}>
          <option value="">Seleccionar…</option>{charts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="check"><input type="checkbox" checked={!!comp.config.show_title} onChange={e=>onUpdateConfig('show_title',e.target.checked)}/><span>Mostrar título</span></label>
      <label className="control"><span>Título</span><input value={(comp.config.title as string)||''} onChange={e=>onUpdateConfig('title',e.target.value)}/></label>
    </>}

    {comp.type==='text'&&<>
      <label className="control"><span>Contenido</span><textarea value={(comp.config.content as string)||''} onChange={e=>onUpdateConfig('content',e.target.value)} rows={3}/></label>
      <label className="control"><span>Alineación</span><select value={(comp.config.align as string)||'left'} onChange={e=>onUpdateConfig('align',e.target.value)}>
        <option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>
      </select></label>
      <label className="control"><span>Tamaño</span><select value={(comp.config.size as string)||'base'} onChange={e=>onUpdateConfig('size',e.target.value)}>
        <option value="sm">Pequeño</option><option value="base">Normal</option><option value="lg">Grande</option><option value="xl">XL</option>
      </select></label>
    </>}

    {comp.type==='heading'&&<>
      <label className="control"><span>Texto</span><input value={(comp.config.text as string)||''} onChange={e=>onUpdateConfig('text',e.target.value)}/></label>
      <label className="control"><span>Nivel</span><select value={(comp.config.level as string)||'h2'} onChange={e=>onUpdateConfig('level',e.target.value)}>
        <option value="h1">H1</option><option value="h2">H2</option><option value="h3">H3</option><option value="h4">H4</option>
      </select></label>
    </>}

    {comp.type==='image'&&<>
      <label className="control"><span>URL de imagen</span><input value={(comp.config.src as string)||''} onChange={e=>onUpdateConfig('src',e.target.value)} placeholder="https://..."/></label>
      <label className="control"><span>Texto alternativo</span><input value={(comp.config.alt as string)||''} onChange={e=>onUpdateConfig('alt',e.target.value)}/></label>
      <label className="control"><span>Ancho</span><input value={(comp.config.width as string)||'100%'} onChange={e=>onUpdateConfig('width',e.target.value)}/></label>
    </>}

    {comp.type==='button'&&<>
      <div className="ce-flow-title"><Workflow size={14}/><div><strong>Acción del botón</strong><small>Conecta este botón con otra parte del sistema</small></div></div>
      <label className="control"><span>Texto del botón</span><input value={(comp.config.label as string)||''} onChange={e=>onUpdateConfig('label',e.target.value)}/></label>
      <label className="control"><span>Variante</span><select value={(comp.config.variant as string)||'primary'} onChange={e=>onUpdateConfig('variant',e.target.value)}>
        <option value="primary">Primary</option><option value="secondary">Secondary</option><option value="ghost">Ghost</option><option value="danger">Danger</option>
      </select></label>
      <label className="control"><span>Al hacer clic</span><select value={(comp.config.action as string)||'modal'} onChange={e=>onUpdateConfig('action',e.target.value)}><option value="modal">Abrir un modal construido aquí</option><option value="route">Ir a otra página del proyecto</option><option value="external">Abrir enlace externo</option><option value="scroll">Desplazarse a un componente</option><option value="component">Mostrar / ocultar componente</option><option value="request">Ejecutar petición HTTP</option><option value="event">Emitir evento personalizado</option><option value="none">Sin acción</option></select></label>
      {comp.config.action==='route'&&<label className="control"><span>Página destino</span><select value={String(comp.config.route_id??'')} onChange={e=>{const selected=routes.find(route=>route.id===Number(e.target.value));onUpdateConfig('route_id',Number(e.target.value)||null);onUpdateConfig('route_path',selected?routePath(selected,routes):'');}}><option value="">Seleccionar ruta…</option>{routes.filter(route=>route.content_type!=='divider').map(route=><option key={route.id} value={route.id}>{route.name} · {routePath(route,routes)}</option>)}</select></label>}
      {comp.config.action==='external'&&<><label className="control"><span>URL externa</span><input value={(comp.config.url as string)||''} onChange={e=>onUpdateConfig('url',e.target.value)} placeholder="https://..."/></label><label className="check"><input type="checkbox" checked={comp.config.new_tab!==false} onChange={e=>onUpdateConfig('new_tab',e.target.checked)}/><span>Abrir en pestaña nueva</span></label></>}
      {['scroll','component'].includes(String(comp.config.action))&&<label className="control"><span>ID del componente destino</span><input value={String(comp.config.target_component_id??'')} onChange={e=>onUpdateConfig('target_component_id',e.target.value)} placeholder="comp_... (visible en la cabecera del bloque)"/></label>}
      {comp.config.action==='component'&&<label className="control"><span>Control</span><select value={String(comp.config.component_mode??'toggle')} onChange={e=>onUpdateConfig('component_mode',e.target.value)}><option value="toggle">Alternar visible/oculto</option><option value="show">Mostrar</option><option value="hide">Ocultar</option></select></label>}
      {comp.config.action==='request'&&<><div className="ce-inline-grid"><label className="control"><span>Método</span><select value={String(comp.config.request_method??'POST')} onChange={e=>onUpdateConfig('request_method',e.target.value)}><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select></label><label className="control"><span>Endpoint</span><input value={String(comp.config.request_url??'')} onChange={e=>onUpdateConfig('request_url',e.target.value)} placeholder="/api/mi-accion"/></label></div><label className="control"><span>Body JSON opcional</span><textarea className="ce-code" rows={4} value={String(comp.config.request_body??'{}')} onChange={e=>onUpdateConfig('request_body',e.target.value)} placeholder={'{"status":"activo"}'}/></label><label className="control"><span>Mensaje de confirmación opcional</span><input value={String(comp.config.confirm_message??'')} onChange={e=>onUpdateConfig('confirm_message',e.target.value)} placeholder="¿Ejecutar esta acción?"/></label></>}
      {comp.config.action==='event'&&<label className="control"><span>Nombre del evento</span><input value={String(comp.config.event_name??'')} onChange={e=>onUpdateConfig('event_name',e.target.value)} placeholder="pedido:aprobado"/></label>}
      {comp.config.action==='modal'&&<><label className="control"><span>Título del modal</span><input value={(comp.config.modal_title as string)||''} onChange={e=>onUpdateConfig('modal_title',e.target.value)} placeholder="Detalle, Nuevo registro…"/></label><p className="ce-builder-note"><Layers size={13}/> El contenido se construye arrastrando componentes en el canvas interno.</p></>}
    </>}

    {comp.type==='hero'&&<><label className="control"><span>Texto superior</span><input value={String(comp.config.eyebrow??'')} onChange={e=>onUpdateConfig('eyebrow',e.target.value)}/></label><label className="control"><span>Título</span><input value={String(comp.config.title??'')} onChange={e=>onUpdateConfig('title',e.target.value)}/></label><label className="control"><span>Descripción</span><textarea rows={3} value={String(comp.config.description??'')} onChange={e=>onUpdateConfig('description',e.target.value)}/></label><div className="ce-inline-grid"><label className="control"><span>Alineación</span><select value={String(comp.config.align??'left')} onChange={e=>onUpdateConfig('align',e.target.value)}><option value="left">Izquierda</option><option value="center">Centro</option></select></label><label className="control"><span>Fondo</span><input type="color" value={String(comp.config.background??'#f5f3ff')} onChange={e=>onUpdateConfig('background',e.target.value)}/></label></div></>}
    {comp.type==='metric'&&<><div className="ce-inline-grid"><label className="control"><span>Etiqueta</span><input value={String(comp.config.label??'')} onChange={e=>onUpdateConfig('label',e.target.value)}/></label><label className="control"><span>Valor</span><input value={String(comp.config.value??'')} onChange={e=>onUpdateConfig('value',e.target.value)}/></label></div><label className="control"><span>Texto auxiliar</span><input value={String(comp.config.helper??'')} onChange={e=>onUpdateConfig('helper',e.target.value)}/></label><label className="control"><span>Color</span><input type="color" value={String(comp.config.color??'#6366f1')} onChange={e=>onUpdateConfig('color',e.target.value)}/></label></>}
    {comp.type==='progress'&&<><label className="control"><span>Etiqueta</span><input value={String(comp.config.label??'')} onChange={e=>onUpdateConfig('label',e.target.value)}/></label><div className="ce-inline-grid"><label className="control"><span>Avance %</span><input type="number" min={0} max={100} value={Number(comp.config.value)||0} onChange={e=>onUpdateConfig('value',Math.max(0,Math.min(100,Number(e.target.value))))}/></label><label className="control"><span>Color</span><input type="color" value={String(comp.config.color??'#22c55e')} onChange={e=>onUpdateConfig('color',e.target.value)}/></label></div></>}
    {comp.type==='video'&&<><label className="control"><span>URL del video</span><input value={String(comp.config.src??'')} onChange={e=>onUpdateConfig('src',e.target.value)} placeholder="YouTube, Vimeo o MP4"/></label><div className="ce-inline-grid"><label className="control"><span>Título accesible</span><input value={String(comp.config.title??'')} onChange={e=>onUpdateConfig('title',e.target.value)}/></label><label className="control"><span>Proporción</span><select value={String(comp.config.ratio??'16/9')} onChange={e=>onUpdateConfig('ratio',e.target.value)}><option value="16/9">Panorámico 16:9</option><option value="4/3">Clásico 4:3</option><option value="1/1">Cuadrado</option><option value="9/16">Vertical 9:16</option></select></label></div></>}
    {comp.type==='accordion'&&<AccordionEditor items={normalizeAccordion(comp.config.items)} onChange={items=>onUpdateConfig('items',items)}/>}
    {comp.type==='quote'&&<><label className="control"><span>Testimonio o cita</span><textarea rows={3} value={String(comp.config.quote??'')} onChange={e=>onUpdateConfig('quote',e.target.value)}/></label><div className="ce-inline-grid"><label className="control"><span>Autor</span><input value={String(comp.config.author??'')} onChange={e=>onUpdateConfig('author',e.target.value)}/></label><label className="control"><span>Cargo / referencia</span><input value={String(comp.config.role??'')} onChange={e=>onUpdateConfig('role',e.target.value)}/></label></div></>}
    {comp.type==='gallery'&&<><label className="control"><span>Imágenes, una URL por línea</span><textarea rows={5} value={normalizeStringList(comp.config.images).join('\n')} onChange={e=>onUpdateConfig('images',e.target.value.split('\n').map(value=>value.trim()).filter(Boolean))}/></label><div className="ce-inline-grid"><label className="control"><span>Columnas</span><select value={Number(comp.config.columns)||2} onChange={e=>onUpdateConfig('columns',Number(e.target.value))}>{[1,2,3,4,5,6].map(value=><option key={value} value={value}>{value}</option>)}</select></label><label className="check"><input type="checkbox" checked={comp.config.rounded!==false} onChange={e=>onUpdateConfig('rounded',e.target.checked)}/><span>Esquinas redondeadas</span></label></div></>}
    {comp.type==='checklist'&&<><label className="control"><span>Título</span><input value={String(comp.config.title??'')} onChange={e=>onUpdateConfig('title',e.target.value)}/></label><label className="control"><span>Elementos, uno por línea</span><textarea rows={5} value={normalizeStringList(comp.config.items).join('\n')} onChange={e=>onUpdateConfig('items',e.target.value.split('\n').map(value=>value.trim()).filter(Boolean))}/></label><label className="control"><span>Color</span><input type="color" value={String(comp.config.color??'#22c55e')} onChange={e=>onUpdateConfig('color',e.target.value)}/></label></>}
    {comp.type==='timeline'&&<label className="control"><span>Pasos: título | descripción</span><textarea rows={6} value={normalizeTimeline(comp.config.items).map(item=>`${item.title} | ${item.description}`).join('\n')} onChange={e=>onUpdateConfig('items',e.target.value.split('\n').filter(Boolean).map(line=>{const [title,...rest]=line.split('|');return{title:title.trim(),description:rest.join('|').trim()};}))}/></label>}
    {comp.type==='embed'&&<><label className="control"><span>URL para embeber</span><input value={String(comp.config.url??'')} onChange={e=>onUpdateConfig('url',e.target.value)} placeholder="https://maps.google.com/…"/></label><div className="ce-inline-grid"><label className="control"><span>Título accesible</span><input value={String(comp.config.title??'')} onChange={e=>onUpdateConfig('title',e.target.value)}/></label><label className="control"><span>Altura</span><input type="number" min={160} max={1000} value={Number(comp.config.height)||360} onChange={e=>onUpdateConfig('height',Number(e.target.value))}/></label></div></>}

    {comp.type==='divider'&&<label className="control"><span>Estilo</span><select value={(comp.config.style as string)||'solid'} onChange={e=>onUpdateConfig('style',e.target.value)}>
      <option value="solid">Sólido</option><option value="dashed">Guiones</option><option value="dotted">Puntos</option>
    </select></label>}

    {comp.type==='spacer'&&<label className="control"><span>Altura (px)</span><input type="number" value={(comp.config.height as number)||24} onChange={e=>onUpdateConfig('height',Number(e.target.value))}/></label>}

    {comp.type==='code'&&<>
      <label className="control"><span>Código</span><textarea value={(comp.config.code as string)||''} onChange={e=>onUpdateConfig('code',e.target.value)} rows={5} className="ce-code"/></label>
      <label className="control"><span>Lenguaje</span><select value={(comp.config.language as string)||'javascript'} onChange={e=>onUpdateConfig('language',e.target.value)}>
        <option value="javascript">JavaScript</option><option value="php">PHP</option><option value="html">HTML</option><option value="css">CSS</option><option value="sql">SQL</option><option value="json">JSON</option>
      </select></label>
    </>}

    {comp.type==='alert'&&<>
      <label className="control"><span>Mensaje</span><textarea value={(comp.config.message as string)||''} onChange={e=>onUpdateConfig('message',e.target.value)} rows={2}/></label>
      <label className="control"><span>Tipo</span><select value={(comp.config.type as string)||'info'} onChange={e=>onUpdateConfig('type',e.target.value)}>
        <option value="info">Info</option><option value="success">Éxito</option><option value="warning">Advertencia</option><option value="error">Error</option>
      </select></label>
    </>}

    {comp.type==='badge'&&<>
      <label className="control"><span>Label</span><input value={(comp.config.label as string)||''} onChange={e=>onUpdateConfig('label',e.target.value)}/></label>
      <label className="control"><span>Color</span><input type="color" value={(comp.config.color as string)||'#6366f1'} onChange={e=>onUpdateConfig('color',e.target.value)}/></label>
    </>}

    {comp.type==='list'&&<>
      <label className="control"><span>Tabla</span><select value={(comp.config.table_name as string)||''} onChange={e=>onUpdateConfig('table_name',e.target.value)}>
        <option value="">Seleccionar…</option>{tables.map(t=><option key={t} value={t}>{t}</option>)}
      </select></label>
      <label className="control"><span>Campo de display</span><input value={(comp.config.display_field as string)||''} onChange={e=>onUpdateConfig('display_field',e.target.value)} placeholder="nombre"/></label>
      <label className="control"><span>Máximo de elementos</span><input type="number" min={1} max={50} value={Number(comp.config.limit)||6} onChange={e=>onUpdateConfig('limit',Math.max(1,Math.min(50,Number(e.target.value))))}/></label>
      <label className="check"><input type="checkbox" checked={!!comp.config.show_title} onChange={e=>onUpdateConfig('show_title',e.target.checked)}/><span>Mostrar título</span></label>
    </>}

    {comp.type==='tabs'&&<p className="ce-builder-note"><LayoutList size={13}/> Cada pestaña es un canvas independiente. Activa una pestaña y arrastra dentro cualquier componente.</p>}
    {comp.type==='columns'&&<><div className="ce-inline-grid"><label className="control"><span>Columnas</span><select value={Number(comp.config.columns)||2} onChange={e=>{const count=Number(e.target.value);const current=(comp.config.children as PageComponent[][]|undefined)??[];onUpdate({config:{...comp.config,columns:count,children:Array.from({length:count},(_,index)=>current[index]??[])}});}}>{Array.from({length:12},(_,index)=>index+1).map(count=><option key={count} value={count}>{count} {count===1?'columna':'columnas'}</option>)}</select></label><label className="control"><span>Separación</span><select value={Number(comp.config.gap??12)} onChange={e=>onUpdateConfig('gap',Number(e.target.value))}><option value={0}>Sin espacio</option><option value={6}>Compacta</option><option value={12}>Normal</option><option value={20}>Amplia</option></select></label></div><p className="ce-builder-note"><Columns3 size={13}/> Grid flexible de hasta 12 columnas. En pantallas pequeñas se adapta automáticamente.</p></>}
    {comp.type==='card'&&<><div className="ce-inline-grid"><label className="control"><span>Título</span><input value={String(comp.config.title??'')} onChange={e=>onUpdateConfig('title',e.target.value)} placeholder="Título de la tarjeta"/></label><label className="control"><span>Subtítulo</span><input value={String(comp.config.subtitle??'')} onChange={e=>onUpdateConfig('subtitle',e.target.value)} placeholder="Descripción breve"/></label></div><label className="check"><input type="checkbox" checked={comp.config.bordered!==false} onChange={e=>onUpdateConfig('bordered',e.target.checked)}/><span>Mostrar borde y fondo</span></label><p className="ce-builder-note"><CreditCard size={13}/> Arrastra cualquier composición al canvas de la tarjeta.</p></>}
    {comp.type==='section'&&<><div className="ce-inline-grid"><label className="control"><span>Título</span><input value={String(comp.config.title??'')} onChange={e=>onUpdateConfig('title',e.target.value)}/></label><label className="control"><span>Estilo</span><select value={String(comp.config.tone??'plain')} onChange={e=>onUpdateConfig('tone',e.target.value)}><option value="plain">Simple</option><option value="soft">Fondo suave</option><option value="accent">Destacada</option></select></label></div><div className="ce-inline-grid"><label className="control"><span>Subtítulo</span><input value={String(comp.config.subtitle??'')} onChange={e=>onUpdateConfig('subtitle',e.target.value)}/></label><label className="control"><span>Espaciado interno</span><input type="number" min={0} max={80} value={Number(comp.config.padding??24)} onChange={e=>onUpdateConfig('padding',Math.max(0,Math.min(80,Number(e.target.value))))}/></label></div><p className="ce-builder-note"><PanelTop size={13}/> Esta sección es un canvas: arrastra dentro cualquier bloque.</p></>}

    {!['button','spacer'].includes(comp.type)&&<label className="check ce-visibility"><input type="checkbox" checked={!!comp.config.initially_hidden} onChange={e=>onUpdateConfig('initially_hidden',e.target.checked)}/><span>Iniciar oculto (otro botón puede mostrarlo)</span></label>}
  </div>;
}

function routePath(route:BuilderRoute,routes:BuilderRoute[]):string{const byId=new Map(routes.map(item=>[item.id,item]));const parts=[route.slug];let parent=route.parent_id?byId.get(route.parent_id):undefined;while(parent){parts.unshift(parent.slug);parent=parent.parent_id?byId.get(parent.parent_id):undefined;}return'/'+parts.join('/');}
function buttonActionLabel(action:string):string{return({modal:'Abre modal',route:'Cambia de página',external:'Abre enlace',scroll:'Desplaza',component:'Controla bloque',request:'Ejecuta HTTP',event:'Emite evento',url:'Abre ruta'} as Record<string,string>)[action]||'Sin acción';}
function normalizeAccordion(value:unknown):{title:string;content:string}[]{return Array.isArray(value)?value.map(item=>({title:String((item as Record<string,unknown>).title??''),content:String((item as Record<string,unknown>).content??'')})):[{title:'Sección',content:'Contenido'}];}
function normalizeStringList(value:unknown):string[]{return Array.isArray(value)?value.map(String):[];}
function normalizeTimeline(value:unknown):{title:string;description:string}[]{return Array.isArray(value)?value.map(item=>({title:String((item as Record<string,unknown>).title??''),description:String((item as Record<string,unknown>).description??'')})):[];}
function AccordionEditor({items,onChange}:{items:{title:string;content:string}[];onChange:(items:{title:string;content:string}[])=>void}){return <div className="ce-accordion-editor"><div className="ce-flow-title"><ChevronDown size={14}/><div><strong>Secciones</strong><small>Contenido desplegable</small></div></div>{items.map((item,index)=><div key={index}><input value={item.title} onChange={e=>onChange(items.map((current,i)=>i===index?{...current,title:e.target.value}:current))}/><textarea rows={2} value={item.content} onChange={e=>onChange(items.map((current,i)=>i===index?{...current,content:e.target.value}:current))}/><button className="danger" disabled={items.length===1} onClick={()=>onChange(items.filter((_,i)=>i!==index))}><Trash2 size={12}/>Eliminar</button></div>)}<button onClick={()=>onChange([...items,{title:`Sección ${items.length+1}`,content:''}])}><Plus size={12}/>Agregar sección</button></div>;}

/* ================= Preview Renderer ================= */
export function renderComponents(components:PageComponent[],forms:BuilderForm[]=[],views:BuilderView[]=[]):React.ReactNode{
  return components.map(comp=><RuntimeComponent key={comp.id} comp={comp} forms={forms} views={views}/>);
}

function RuntimeComponent({comp,forms,views}:{comp:PageComponent;forms:BuilderForm[];views:BuilderView[]}){
  const [visible,setVisible]=useState(!comp.config.initially_hidden);
  useEffect(()=>{const handler=(event:Event)=>{const detail=(event as CustomEvent<{id:string;mode:'show'|'hide'|'toggle'}>).detail;if(detail?.id!==comp.id)return;setVisible(current=>detail.mode==='show'?true:detail.mode==='hide'?false:!current);};window.addEventListener('nexodb:component',handler);return()=>window.removeEventListener('nexodb:component',handler);},[comp.id]);
  if(!visible)return null;
  const content=(()=>{
    switch(comp.type){
      case 'form': return <SavedFormRuntime form={forms.find(form=>form.id===Number(comp.config.form_id))} title={comp.config.show_title===false?'':String(comp.config.title||comp.label)}/>;
      case 'table': return <SavedViewRuntime view={views.find(view=>view.id===Number(comp.config.view_id))} forms={forms} title={comp.config.show_title===false?'':String(comp.config.title||comp.label)}/>;
      case 'chart': return <ChartRuntime chartId={Number(comp.config.chart_id)} title={comp.config.show_title===false?'':String(comp.config.title||comp.label)}/>;
      case 'text': return <p className="preview-comp preview-text" style={{textAlign:(comp.config.align as React.CSSProperties['textAlign'])||'left',fontSize:comp.config.size==='sm'?'13px':comp.config.size==='lg'?'18px':comp.config.size==='xl'?'24px':'15px'}}>{comp.config.content as string}</p>;
      case 'heading': return <div className="preview-comp">{comp.config.level==='h1'?<h1>{comp.config.text as string}</h1>:comp.config.level==='h3'?<h3>{comp.config.text as string}</h3>:comp.config.level==='h4'?<h4>{comp.config.text as string}</h4>:<h2>{comp.config.text as string}</h2>}</div>;
      case 'image': return <div className="preview-comp preview-image"><img src={comp.config.src as string} alt={comp.config.alt as string} style={{width:comp.config.width as string}}/></div>;
      case 'button': return <ActionButtonRuntime component={comp} forms={forms} views={views}/>;
      case 'divider': return <hr className="preview-comp preview-divider" style={{borderStyle:(comp.config.style as string)||'solid'}}/>;
      case 'spacer': return <div className="preview-comp" style={{height:comp.config.height as number}}/>;
      case 'code': return <div className="preview-comp preview-code"><pre><code>{comp.config.code as string}</code></pre></div>;
      case 'alert': return <div className={`preview-comp preview-alert alert-${comp.config.type||'info'}`}>{comp.config.message as string}</div>;
      case 'badge': return <div className="preview-comp"><span className="preview-badge-demo" style={{background:comp.config.color as string}}>{comp.config.label as string}</span></div>;
      case 'list': return <ListRuntime table={String(comp.config.table_name||'')} displayField={String(comp.config.display_field||'')} title={comp.config.show_title===false?'':String(comp.config.title||comp.label)} limit={Number(comp.config.limit)||6}/>;
      case 'tabs': return <TabsRuntime tabs={normalizeTabs(comp.config.tabs)} forms={forms} views={views}/>;
      case 'columns': {const count=Math.max(1,Math.min(12,Number(comp.config.columns)||2));const children=(comp.config.children as PageComponent[][]|undefined)??[];return <div className="preview-comp preview-cols" style={{gridTemplateColumns:`repeat(${count},minmax(0,1fr))`,gap:Number(comp.config.gap??12)}}>{Array.from({length:count},(_,i)=><div key={i} className="preview-col runtime-container">{children[i]?.length?renderComponents(children[i],forms,views):<span className="runtime-empty-container">Columna vacía</span>}</div>)}</div>;}
      case 'card': {const children=(comp.config.children as PageComponent[]|undefined)??[];return <div className={`preview-comp preview-card ${comp.config.bordered===false?'borderless':''}`}><div className="preview-card-header"><strong>{String(comp.config.title||'Tarjeta')}</strong>{Boolean(comp.config.subtitle)&&<small>{String(comp.config.subtitle)}</small>}</div><div className="preview-card-body">{children.length?renderComponents(children,forms,views):<span className="runtime-empty-container">Tarjeta vacía</span>}</div></div>;}
      case 'section': {const children=(comp.config.children as PageComponent[]|undefined)??[];return <section className={`preview-comp runtime-section tone-${comp.config.tone||'plain'}`} style={{padding:Number(comp.config.padding)||24}}><header><h2>{String(comp.config.title||'')}</h2>{Boolean(comp.config.subtitle)&&<p>{String(comp.config.subtitle)}</p>}</header><div>{children.length?renderComponents(children,forms,views):<span className="runtime-empty-container">Sección vacía</span>}</div></section>;}
      case 'hero': return <section className="preview-comp runtime-hero" style={{textAlign:(comp.config.align as React.CSSProperties['textAlign'])||'left',background:String(comp.config.background||'#f5f3ff')}}><span>{String(comp.config.eyebrow||'')}</span><h1>{String(comp.config.title||'')}</h1><p>{String(comp.config.description||'')}</p></section>;
      case 'metric': return <div className="preview-comp runtime-metric" style={{borderTopColor:String(comp.config.color||'#6366f1')}}><span>{String(comp.config.label||'Indicador')}</span><strong>{String(comp.config.value??'0')}</strong><small>{String(comp.config.helper||'')}</small></div>;
      case 'progress': {const value=Math.max(0,Math.min(100,Number(comp.config.value)||0));return <div className="preview-comp runtime-progress"><div><span>{String(comp.config.label||'Progreso')}</span><strong>{value}%</strong></div><i><b style={{width:`${value}%`,background:String(comp.config.color||'#22c55e')}}/></i></div>;}
      case 'accordion': return <AccordionRuntime items={normalizeAccordion(comp.config.items)}/>;
      case 'video': return <VideoRuntime src={String(comp.config.src||'')} title={String(comp.config.title||'Video')} ratio={String(comp.config.ratio||'16/9')}/>;
      case 'quote': return <blockquote className="preview-comp runtime-quote"><Quote size={24}/><p>{String(comp.config.quote||'')}</p><footer><strong>{String(comp.config.author||'')}</strong><span>{String(comp.config.role||'')}</span></footer></blockquote>;
      case 'gallery': {const images=normalizeStringList(comp.config.images);const columns=Math.max(1,Math.min(6,Number(comp.config.columns)||2));return <div className="preview-comp runtime-gallery" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}}>{images.map((src,index)=><img key={`${src}-${index}`} src={src} alt={`Galería ${index+1}`} style={{borderRadius:comp.config.rounded===false?0:10}}/>)}</div>;}
      case 'checklist': return <section className="preview-comp runtime-checklist"><h3>{String(comp.config.title||'')}</h3><ul>{normalizeStringList(comp.config.items).map((item,index)=><li key={`${item}-${index}`}><i style={{background:String(comp.config.color||'#22c55e')}}>✓</i><span>{item}</span></li>)}</ul></section>;
      case 'timeline': return <section className="preview-comp runtime-timeline">{normalizeTimeline(comp.config.items).map((item,index)=><article key={index}><i/><div><strong>{item.title}</strong><p>{item.description}</p></div></article>)}</section>;
      case 'embed': return comp.config.url?<iframe className="preview-comp runtime-embed" src={String(comp.config.url)} title={String(comp.config.title||'Contenido externo')} style={{height:Math.max(160,Number(comp.config.height)||360)}}/>:<MissingComponent icon={PanelsTopLeft} text="Agrega una URL para embeber"/>;
      case 'table_detail': return <div className="preview-comp preview-table-detail"><div className="preview-comp-header"><Table2 size={16}/><span>{comp.label}</span></div><div className="preview-detail-placeholder"><p>Detalle de tabla → <code>{(comp.config.table_name as string)||'sin tabla'}</code></p></div></div>;
      default: return <div className="preview-comp preview-unknown"><FileText size={16}/><span>{comp.label}</span></div>;
    }
  })();
  return <div className="runtime-node" data-nexo-component={comp.id}>{content}</div>;
}

function SavedFormRuntime({form,title,initialValues={},rowId,onSaved}:{form?:BuilderForm;title?:string;initialValues?:Record<string,unknown>;rowId?:number;onSaved?:()=>void}){
  const initial=()=>Object.fromEntries((form?.fields??[]).map(field=>[field.field_key,initialValues[field.source_column||field.field_key]??field.default_value??'']));
  const [values,setValues]=useState<Record<string,unknown>>(initial);
  const [submitted,setSubmitted]=useState(false);
  const [saving,setSaving]=useState(false); const [message,setMessage]=useState<{type:'success'|'error';text:string}|null>(null);
  useEffect(()=>{setValues(initial());setSubmitted(false);setMessage(null);},[form,rowId]);
  if(!form)return <MissingComponent icon={FormInput} text="Selecciona un formulario creado"/>;
  const dataFields=form.fields.filter(field=>!['divider','heading','button'].includes(field.field_type));
  const fields=dataFields.filter(field=>field.field_type!=='hidden');
  const errors=Object.fromEntries(fields.filter(field=>field.required&&(values[field.field_key]===undefined||values[field.field_key]===null||values[field.field_key]==='')).map(field=>[field.field_key,`${field.label} es obligatorio`]));
  async function submit(event:React.FormEvent){event.preventDefault();setSubmitted(true);setMessage(null);if(Object.keys(errors).length)return;setSaving(true);try{const payload=Object.fromEntries(dataFields.map(field=>[field.source_column||field.field_key,values[field.field_key]]));if(rowId)await api.updateRow(form!.table_name,rowId,payload);else await api.createRow(form!.table_name,payload);setMessage({type:'success',text:rowId?'Registro actualizado correctamente.':'Registro guardado correctamente.'});if(!rowId)setValues(initial());onSaved?.();}catch(error){setMessage({type:'error',text:error instanceof Error?error.message:'No se pudo guardar el registro.'});}finally{setSaving(false);}}
  const inputVariant=String(form.settings?.inputVariant??'outline');
  return <form className={`runtime-form preview-comp input-${inputVariant}`} onSubmit={submit}>{title&&<div className="runtime-component-title"><FormInput size={16}/><div><strong>{title}</strong><small>{form.form_key} · {form.table_name}</small></div></div>}<div className="runtime-form-grid">{form.fields.map(field=><RuntimeField key={field.field_key} field={field} value={values[field.field_key]} error={submitted?errors[field.field_key]:''} onChange={value=>setValues(current=>({...current,[field.field_key]:value}))}/>)}</div>{message&&<div className={`runtime-feedback ${message.type}`}>{message.text}</div>}<div className="runtime-form-actions"><button type="button" className="button ghost" onClick={()=>{setValues(initial());setSubmitted(false);setMessage(null);}}>Limpiar</button><button type="submit" className="button primary" disabled={saving}>{saving?'Guardando…':rowId?'Actualizar':form.submit_label}</button></div></form>;
}

function ChartRuntime({chartId,title}:{chartId:number;title?:string}){
  const [result,setResult]=useState<Awaited<ReturnType<typeof api.chartData>>|null>(null); const [error,setError]=useState('');
  useEffect(()=>{if(!chartId)return;api.chartData(chartId).then(setResult).catch(err=>setError(err instanceof Error?err.message:'No se pudo cargar la gráfica.'));},[chartId]);
  if(!chartId)return <MissingComponent icon={BarChart3} text="Selecciona una gráfica creada"/>;
  if(error)return <div className="runtime-feedback error">{error}</div>;
  if(!result)return <div className="runtime-chart-loading"><LoaderCircle className="spin" size={18}/>Cargando gráfica…</div>;
  const max=Math.max(...result.data.map(item=>item.value),1);
  return <section className="runtime-chart preview-comp">{title&&<div className="runtime-component-title"><BarChart3 size={16}/><div><strong>{title}</strong><small>{result.chart.chart_type}</small></div></div>}<div className="runtime-chart-bars">{result.data.map((item,index)=><div key={`${item.label}-${index}`}><span>{item.label}</span><i><b style={{width:`${Math.max(3,item.value/max*100)}%`,background:result.chart.color}}/></i><strong>{item.value}</strong></div>)}</div></section>;
}

function ListRuntime({table,displayField,title,limit}:{table:string;displayField:string;title?:string;limit:number}){const [rows,setRows]=useState<Record<string,unknown>[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState('');useEffect(()=>{if(!table)return;setLoading(true);api.browse(table).then(page=>setRows(page.data.slice(0,limit))).catch(err=>setError(err instanceof Error?err.message:'No se pudo cargar la lista.')).finally(()=>setLoading(false));},[table,limit]);if(!table||!displayField)return <MissingComponent icon={ListOrdered} text="Selecciona tabla y campo para la lista"/>;return <section className="preview-comp runtime-list">{title&&<div className="runtime-component-title"><ListOrdered size={16}/><div><strong>{title}</strong><small>{table}</small></div></div>}{loading?<div className="runtime-chart-loading"><LoaderCircle className="spin" size={16}/>Cargando…</div>:error?<div className="runtime-feedback error">{error}</div>:<ul>{rows.map((row,index)=><li key={String(row.id??index)}><span>{String(row[displayField]??'—')}</span><small>#{String(row.id??index+1)}</small></li>)}</ul>}</section>;}

function RuntimeField({field,value,error,onChange}:{field:BuilderFormField;value:unknown;error?:string;onChange:(value:unknown)=>void}){
  const [remote,setRemote]=useState<{value:string|number;label:string}[]>([]);
  const relation=field.config?.options_source==='relation'; const relationTable=String(field.config?.relation_table??''); const valueColumn=String(field.config?.relation_value_column??'id'); const labelColumn=String(field.config?.relation_label_column??'');
  useEffect(()=>{if(relation&&relationTable&&labelColumn)api.lookupOptions(relationTable,valueColumn,labelColumn).then(setRemote).catch(()=>setRemote([]));},[relation,relationTable,valueColumn,labelColumn]);
  if(field.field_type==='heading')return <div className="runtime-heading" style={{gridColumn:`span ${field.width}`}}><h3>{field.label}</h3><p>{field.help_text}</p></div>;
  if(field.field_type==='divider')return <div className="runtime-divider" style={{gridColumn:`span ${field.width}`}}>{field.label&&<span>{field.label}</span>}</div>;
  if(field.field_type==='button')return <div style={{gridColumn:`span ${field.width}`}}><button type="button" className="button primary">{field.label}</button></div>;
  if(field.field_type==='hidden')return null;
  const options=relation?remote.map(option=>({value:String(option.value),label:option.label})):(field.options??[]).map(option=>({value:option,label:option}));
  return <label className={`runtime-field ${error?'invalid':''}`} style={{gridColumn:`span ${field.width}`}}><span>{field.label}{field.required&&<b> *</b>}</span>{field.field_type==='textarea'?<textarea rows={3} value={String(value??'')} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder??''}/>:field.field_type==='file'?<input type="file" onChange={e=>onChange(e.target.files?.[0]?.name??'')}/>:['select','multiselect','autocomplete'].includes(field.field_type)?<select value={String(value??'')} onChange={e=>onChange(e.target.value)}><option value="">{field.placeholder||'Seleccionar…'}</option>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:field.field_type==='radio'?<div className="runtime-options">{options.map(option=><label key={option.value}><input type="radio" checked={value===option.value} onChange={()=>onChange(option.value)}/>{option.label}</label>)}</div>:['checkbox','switch'].includes(field.field_type)?<label className="runtime-check"><input type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)}/><i/>{field.help_text||'Activar'}</label>:<input type={field.field_type==='datetime'?'datetime-local':field.field_type} value={String(value??'')} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder??''}/>} {field.help_text&&!['checkbox','switch'].includes(field.field_type)&&<small>{field.help_text}</small>}{error&&<em>{error}</em>}</label>;
}

function SavedViewRuntime({view,forms,title}:{view?:BuilderView;forms:BuilderForm[];title?:string}){
  const [rows,setRows]=useState<Record<string,unknown>[]>([]); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(false); const [revision,setRevision]=useState(0); const [editor,setEditor]=useState<Record<string,unknown>|null>(null); const [error,setError]=useState('');
  useEffect(()=>{if(!view)return;setLoading(true);setError('');api.browse(view.table_name,1,search).then(page=>setRows(page.data.slice(0,view.per_page))).catch(err=>{setRows([]);setError(err instanceof Error?err.message:'No se pudieron cargar los datos.');}).finally(()=>setLoading(false));},[view,search,revision]);
  if(!view)return <MissingComponent icon={Table2} text="Selecciona una vista de tabla creada"/>;
  const activeView=view; const settings=(activeView.settings??{}) as Record<string,boolean>; const columns=activeView.columns.filter(column=>column.visible); const linkedForm=forms.find(form=>form.table_name===activeView.table_name&&form.active);
  async function remove(row:Record<string,unknown>){const id=Number(row[activeView.primary_key]);if(!id||!window.confirm('¿Eliminar este registro?'))return;try{await api.deleteRow(activeView.table_name,id);setRevision(value=>value+1);}catch(err){setError(err instanceof Error?err.message:'No se pudo eliminar.');}}
  return <section className="runtime-view preview-comp">{title&&<div className="runtime-component-title"><Table2 size={16}/><div><strong>{title}</strong><small>{view.view_key} · ID: {view.primary_key}</small></div></div>}<div className="runtime-view-toolbar">{settings.search&&<div><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar registros…"/></div>}{settings.create&&<button className="button primary" disabled={!linkedForm} title={linkedForm?'Crear registro':'Crea un formulario para esta tabla'} onClick={()=>setEditor({})}><Plus size={14}/>Nuevo</button>}</div>{error&&<div className="runtime-feedback error">{error}</div>}<div className="runtime-table-wrap"><table><thead><tr>{columns.map(column=><th key={column.column_key}>{column.label}</th>)}{(settings.edit||settings.delete)&&<th>Acciones</th>}</tr></thead><tbody>{loading?<tr><td colSpan={columns.length+1}>Cargando datos…</td></tr>:rows.length?rows.map((row,index)=><tr key={String(row[view.primary_key]??index)}>{columns.map(column=><td key={column.column_key}>{formatRuntimeCell(row[column.column_key],column)}</td>)}{(settings.edit||settings.delete)&&<td><div className="runtime-row-actions">{settings.edit&&<button disabled={!linkedForm} onClick={()=>setEditor(row)}>Editar</button>}{settings.delete&&<button onClick={()=>void remove(row)}>Eliminar</button>}</div></td>}</tr>):<tr><td colSpan={columns.length+1}>Sin registros para mostrar</td></tr>}</tbody></table></div>{editor&&linkedForm&&<div className="runtime-modal-backdrop" onMouseDown={event=>event.target===event.currentTarget&&setEditor(null)}><section className="runtime-modal"><header><div><span>{editor[view.primary_key]?'Editar registro':'Nuevo registro'}</span><h2>{linkedForm.name}</h2></div><button onClick={()=>setEditor(null)}><X size={18}/></button></header><div className="runtime-modal-body"><SavedFormRuntime form={linkedForm} initialValues={editor} rowId={editor[view.primary_key]?Number(editor[view.primary_key]):undefined} onSaved={()=>{setEditor(null);setRevision(value=>value+1);}}/></div></section></div>}</section>;
}

function ActionButtonRuntime({component,forms,views}:{component:PageComponent;forms:BuilderForm[];views:BuilderView[]}){
  const [open,setOpen]=useState(false); const [busy,setBusy]=useState(false); const [message,setMessage]=useState<{type:'success'|'error';text:string}|null>(null); const action=String(component.config.action??'none');
  async function click(){
    setMessage(null);
    if(action==='modal'){setOpen(true);return;}
    if(action==='route'||action==='url'&&String(component.config.url||'').startsWith('/')){const path=String(component.config.route_path||component.config.url||'');if(path||component.config.route_id)window.dispatchEvent(new CustomEvent('nexodb:navigate',{detail:{path,routeId:Number(component.config.route_id)||null}}));return;}
    if(action==='external'||action==='url'){const url=String(component.config.url||'');if(url)window.open(url,component.config.new_tab===false?'_self':'_blank','noopener,noreferrer');return;}
    if(action==='scroll'){const target=String(component.config.target_component_id||'');Array.from(document.querySelectorAll<HTMLElement>('[data-nexo-component]')).find(node=>node.dataset.nexoComponent===target)?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    if(action==='component'){window.dispatchEvent(new CustomEvent('nexodb:component',{detail:{id:String(component.config.target_component_id||''),mode:String(component.config.component_mode||'toggle')}}));return;}
    if(action==='event'){window.dispatchEvent(new CustomEvent(String(component.config.event_name||'nexodb:action'),{detail:{componentId:component.id}}));return;}
    if(action==='request'){
      const confirmation=String(component.config.confirm_message||'');if(confirmation&&!window.confirm(confirmation))return;
      setBusy(true);try{const method=String(component.config.request_method||'POST');const raw=String(component.config.request_body||'').trim();const response=await fetch(String(component.config.request_url||''),{method,headers:{Accept:'application/json',...(method==='GET'?{}:{'Content-Type':'application/json'})},body:method==='GET'||method==='DELETE'?undefined:(raw||'{}')});if(!response.ok)throw new Error(`La petición respondió ${response.status}`);setMessage({type:'success',text:String(component.config.success_message||'Acción ejecutada correctamente.')});window.dispatchEvent(new CustomEvent('nexodb:request-success',{detail:{componentId:component.id,status:response.status}}));}catch(error){setMessage({type:'error',text:error instanceof Error?error.message:'No se pudo ejecutar la petición.'});}finally{setBusy(false);}
    }
  }
  const modalComponents=(component.config.modal_components as PageComponent[]|undefined)??legacyModalComponents(component);
  return <div className="preview-comp runtime-button-flow"><div className="runtime-button"><button className={`button ${component.config.variant||'primary'}`} disabled={busy} onClick={()=>void click()}>{busy?<><LoaderCircle className="spin" size={14}/>Ejecutando…</>:String(component.config.label||component.label)}</button></div>{message&&<div className={`runtime-feedback ${message.type}`}>{message.text}</div>}{open&&<div className="runtime-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setOpen(false)}><section className="runtime-modal"><header><div><span>Flujo del proyecto</span><h2>{String(component.config.modal_title||component.config.label||component.label)}</h2></div><button onClick={()=>setOpen(false)}><X size={18}/></button></header><div className="runtime-modal-body">{modalComponents.length?renderComponents(modalComponents,forms,views):<MissingComponent icon={Layers} text="El modal todavía no tiene componentes"/>}</div></section></div>}</div>;
}

function AccordionRuntime({items}:{items:{title:string;content:string}[]}){const [open,setOpen]=useState(0);return <section className="preview-comp runtime-accordion">{items.map((item,index)=><article key={index} className={open===index?'open':''}><button onClick={()=>setOpen(open===index?-1:index)}><span>{item.title}</span><ChevronDown size={15}/></button>{open===index&&<p>{item.content}</p>}</article>)}</section>;}
function VideoRuntime({src,title,ratio}:{src:string;title:string;ratio:string}){if(!src)return <MissingComponent icon={Play} text="Agrega una URL de video"/>;const youtube=src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/)?.[1];return <div className="preview-comp runtime-video" style={{aspectRatio:ratio}}>{youtube?<iframe src={`https://www.youtube.com/embed/${youtube}`} title={title} allowFullScreen/>:<video src={src} controls aria-label={title}/>}</div>;}

function TabsRuntime({tabs,forms,views}:{tabs:TabConfig[];forms:BuilderForm[];views:BuilderView[]}){
  const [active,setActive]=useState(0); const tab=tabs[active];
  return <section className="preview-comp runtime-tabs"><div className="preview-tabs-bar">{tabs.map((item,index)=><button key={item.id} className={active===index?'active':''} onClick={()=>setActive(index)}>{item.label}</button>)}</div><div className="preview-tabs-content">{!tab?<p className="muted">Agrega una pestaña</p>:tab.components.length?renderComponents(tab.components,forms,views):<span className="runtime-empty-container">Pestaña vacía</span>}</div></section>;
}

function legacyModalComponents(component:PageComponent):PageComponent[]{const id=component.config.modal_id;if(!id)return[];const type=component.config.modal_type==='view'?'table':'form';return[{id:`legacy_modal_${component.id}`,type,label:type==='table'?'Vista creada':'Formulario creado',config:type==='table'?{view_id:id,show_title:true}:{form_id:id,show_title:true}}];}

function MissingComponent({icon:Icon,text}:{icon:typeof Table2;text:string}){return <div className="preview-comp runtime-missing"><Icon size={24}/><span>{text}</span></div>;}
function formatRuntimeCell(value:unknown,column:BuilderViewColumn){if(value===null||value===undefined)return'—';if(column.display_type==='boolean')return Number(value)?'Sí':'No';if(column.display_type==='money')return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(value));if(column.display_type==='json')return typeof value==='string'?value:JSON.stringify(value);return String(value);}

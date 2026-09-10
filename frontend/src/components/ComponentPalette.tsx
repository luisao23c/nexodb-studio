import { useEffect, useState } from 'react';
import { GripVertical, Plus, Trash2, Copy, ChevronDown, ChevronRight, Table2, FormInput, BarChart3, Type, Image, MousePointerClick, Minus, Code2, LayoutList, Columns3, Rows3, CreditCard, ListOrdered, FileText, Star, AlertTriangle, X, Layers, Search } from 'lucide-react';
import { api } from '../api/client';
import type { BuilderForm, BuilderFormField, BuilderView, BuilderViewColumn } from '../types';

export interface PageComponent {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
}

type TabConfig = {label:string;content_type:'form'|'view';resource_id:number|null};

const COMPONENT_DEFS: {type:string;label:string;icon:typeof Table2;category:string;color:string;defaultConfig:Record<string,unknown>}[] = [
  {type:'form',label:'Formulario creado',icon:FormInput,category:'Datos',color:'#6366f1',defaultConfig:{form_id:null,show_title:true,title:''}},
  {type:'table',label:'Vista creada',icon:Table2,category:'Datos',color:'#0ea5e9',defaultConfig:{view_id:null,show_title:true,title:''}},
  {type:'chart',label:'Gráfica',icon:BarChart3,category:'Datos',color:'#f59e0b',defaultConfig:{chart_id:null,show_title:true,title:'Gráfica'}},
  {type:'list',label:'Lista',icon:ListOrdered,category:'Datos',color:'#10b981',defaultConfig:{table_name:'',display_field:'',show_title:true,title:'Lista'}},
  {type:'tabs',label:'Tabs',icon:LayoutList,category:'Layout',color:'#8b5cf6',defaultConfig:{tabs:[{label:'Pestaña 1',content_type:'form',resource_id:null},{label:'Pestaña 2',content_type:'form',resource_id:null}]}},
  {type:'columns',label:'Columnas',icon:Columns3,category:'Layout',color:'#14b8a6',defaultConfig:{columns:2,gap:16,children:[[],[]]}},
  {type:'card',label:'Card',icon:CreditCard,category:'Layout',color:'#ec4899',defaultConfig:{title:'',subtitle:'',bordered:true,children:[]}},
  {type:'text',label:'Texto',icon:Type,category:'Contenido',color:'#475569',defaultConfig:{content:'Escribe aquí tu texto...',align:'left',size:'base'}},
  {type:'heading',label:'Título',icon:FileText,category:'Contenido',color:'#1e293b',defaultConfig:{text:'Título',level:'h2'}},
  {type:'image',label:'Imagen',icon:Image,category:'Contenido',color:'#f97316',defaultConfig:{src:'',alt:'',width:'100%'}},
  {type:'button',label:'Botón / Modal',icon:MousePointerClick,category:'Contenido',color:'#6366f1',defaultConfig:{label:'Abrir',variant:'primary',action:'modal',url:'',modal_type:'form',modal_id:null,modal_title:''}},
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

  function onDragStart(e:React.DragEvent,type:string){
    e.dataTransfer.setData('component-type',type);
    e.dataTransfer.effectAllowed='copy';
  }

  return <div className="cp-palette">
    <div className="cp-palette-header"><Layers size={14}/><strong>Componentes</strong><small>Arrastra a la zona</small></div>
    {CATEGORIES.map(cat=><div key={cat} className="cp-cat">
      <button className="cp-cat-header" onClick={()=>setOpenCat(openCat===cat?null:cat)}>
        {openCat===cat?<ChevronDown size={13}/>:<ChevronRight size={13}/>}
        <span>{cat}</span>
        <small>{COMPONENT_DEFS.filter(d=>d.category===cat).length}</small>
      </button>
      {openCat===cat&&<div className="cp-cat-items">
        {COMPONENT_DEFS.filter(d=>d.category===cat).map(def=><div key={def.type} className="cp-item" draggable onDragStart={e=>onDragStart(e,def.type)} title={def.label}>
          <div className="cp-item-icon" style={{background:def.color+'15',color:def.color}}><def.icon size={15}/></div>
          <span>{def.label}</span>
        </div>)}
      </div>}
    </div>)}
  </div>;
}

/* ================= Drop Zone ================= */
export function ComponentDropZone({components,tables,forms,views,onChange}:{components:PageComponent[];tables:string[];forms:BuilderForm[];views:BuilderView[];onChange:(comps:PageComponent[])=>void}){
  const [dragOver,setDragOver] = useState(false);
  const [editingId,setEditingId] = useState<string|null>(null);

  function onDrop(e:React.DragEvent){
    e.preventDefault(); setDragOver(false);
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

  return <div className="cdz-container">
    <div className={`cdz-dropzone ${dragOver?'drag-over':''} ${components.length===0?'empty':''}`}
      onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';setDragOver(true);}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={onDrop}>
      {components.length===0&&<div className="cdz-empty"><LayoutList size={32}/><p>Arrastra componentes aquí</p><small>Suelta componentes de la paleta para construir la página</small></div>}
      {components.map((comp,i)=>{
        const def = COMPONENT_DEFS.find(d=>d.type===comp.type);
        const Icon = def?.icon??FileText;
        const isEditing = editingId===comp.id;
        return <div key={comp.id} className={`cdz-comp ${isEditing?'editing':''}`}>
          <div className="cdz-comp-header" onClick={()=>setEditingId(isEditing?null:comp.id)}>
            <span className="cdz-drag-handle" onClick={e=>e.stopPropagation()}><GripVertical size={14}/></span>
            <div className="cdz-comp-icon" style={{background:def?.color+'15',color:def?.color}}><Icon size={14}/></div>
            <span className="cdz-comp-label">{comp.label}</span>
            <span className="cdz-comp-type">{def?.label}</span>
            <div className="cdz-comp-actions" onClick={e=>e.stopPropagation()}>
              <button onClick={()=>moveComp(comp.id,-1)} disabled={i===0} title="Subir"><ChevronDown size={12} style={{transform:'rotate(180deg)'}}/></button>
              <button onClick={()=>moveComp(comp.id,1)} disabled={i===components.length-1} title="Bajar"><ChevronDown size={12}/></button>
              <button onClick={()=>duplicateComp(comp.id)} title="Duplicar"><Copy size={12}/></button>
              <button className="danger" onClick={()=>removeComp(comp.id)} title="Eliminar"><Trash2 size={12}/></button>
            </div>
          </div>
          {isEditing&&<div className="cdz-comp-config">
            <ComponentEditor comp={comp} tables={tables} forms={forms} views={views} onUpdate={(patch)=>updateComp(comp.id,patch)} onUpdateConfig={(k,v)=>updateConfig(comp.id,k,v)}/>
          </div>}
        </div>;
      })}
    </div>
    {dragOver&&<div className="cdz-drop-indicator"><Plus size={16}/> Soltar aquí</div>}
  </div>;
}

/* ================= Component Editor ================= */
function ComponentEditor({comp,tables,forms,views,onUpdate,onUpdateConfig}:{comp:PageComponent;tables:string[];forms:BuilderForm[];views:BuilderView[];onUpdate:(p:Partial<PageComponent>)=>void;onUpdateConfig:(k:string,v:unknown)=>void}){
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
      <label className="control"><span>Label</span><input value={(comp.config.label as string)||''} onChange={e=>onUpdateConfig('label',e.target.value)}/></label>
      <label className="control"><span>Variante</span><select value={(comp.config.variant as string)||'primary'} onChange={e=>onUpdateConfig('variant',e.target.value)}>
        <option value="primary">Primary</option><option value="secondary">Secondary</option><option value="ghost">Ghost</option><option value="danger">Danger</option>
      </select></label>
      <label className="control"><span>Acción</span><select value={(comp.config.action as string)||'modal'} onChange={e=>onUpdateConfig('action',e.target.value)}><option value="modal">Abrir modal</option><option value="url">Ir a una ruta / URL</option><option value="none">Sin acción</option></select></label>
      {comp.config.action==='url'&&<label className="control"><span>URL</span><input value={(comp.config.url as string)||''} onChange={e=>onUpdateConfig('url',e.target.value)} placeholder="/ruta"/></label>}
      {comp.config.action==='modal'&&<div className="ce-modal-config"><label className="control"><span>Contenido del modal</span><select value={(comp.config.modal_type as string)||'form'} onChange={e=>{onUpdateConfig('modal_type',e.target.value);onUpdateConfig('modal_id',null);}}><option value="form">Formulario creado</option><option value="view">Vista de tabla creada</option></select></label><label className="control"><span>Componente</span><select value={String(comp.config.modal_id??'')} onChange={e=>onUpdateConfig('modal_id',Number(e.target.value)||null)}><option value="">Seleccionar…</option>{comp.config.modal_type==='view'?views.map(view=><option key={view.id} value={view.id}>{view.name}</option>):forms.map(form=><option key={form.id} value={form.id}>{form.name}</option>)}</select></label><label className="control"><span>Título del modal</span><input value={(comp.config.modal_title as string)||''} onChange={e=>onUpdateConfig('modal_title',e.target.value)} placeholder="Usar título del componente"/></label></div>}
    </>}

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
      <label className="check"><input type="checkbox" checked={!!comp.config.show_title} onChange={e=>onUpdateConfig('show_title',e.target.checked)}/><span>Mostrar título</span></label>
    </>}

    {comp.type==='tabs'&&<div className="ce-tabs-editor">
      {(comp.config.tabs as TabConfig[]||[]).map((tab,i)=><div key={i} className="ce-tab-card"><div className="ce-tab-row"><input value={tab.label} onChange={e=>{const tabs=[...(comp.config.tabs as TabConfig[])];tabs[i]={...tab,label:e.target.value};onUpdateConfig('tabs',tabs);}}/><button className="danger" onClick={()=>{const tabs=[...(comp.config.tabs as TabConfig[])];tabs.splice(i,1);onUpdateConfig('tabs',tabs);}}><Trash2 size={12}/></button></div><div className="ce-tab-content"><select value={tab.content_type||'form'} onChange={e=>{const tabs=[...(comp.config.tabs as TabConfig[])];tabs[i]={...tab,content_type:e.target.value as 'form'|'view',resource_id:null};onUpdateConfig('tabs',tabs);}}><option value="form">Formulario</option><option value="view">Vista de tabla</option></select><select value={String(tab.resource_id??'')} onChange={e=>{const tabs=[...(comp.config.tabs as TabConfig[])];tabs[i]={...tab,resource_id:Number(e.target.value)||null};onUpdateConfig('tabs',tabs);}}><option value="">Seleccionar componente…</option>{tab.content_type==='view'?views.map(view=><option key={view.id} value={view.id}>{view.name}</option>):forms.map(form=><option key={form.id} value={form.id}>{form.name}</option>)}</select></div></div>)}
      <button className="button ghost small" onClick={()=>{
        const tabs=[...(comp.config.tabs as TabConfig[]||[]),{label:`Pestaña ${(comp.config.tabs as TabConfig[]||[]).length+1}`,content_type:'form' as const,resource_id:null}]; onUpdateConfig('tabs',tabs);
      }}><Plus size={13}/> Agregar pestaña</button>
    </div>}
  </div>;
}

/* ================= Preview Renderer ================= */
export function renderComponents(components:PageComponent[],forms:BuilderForm[]=[],views:BuilderView[]=[]):React.ReactNode{
  return components.map(comp=>{
    switch(comp.type){
      case 'form': return <SavedFormRuntime key={comp.id} form={forms.find(form=>form.id===Number(comp.config.form_id))} title={comp.config.show_title===false?'':String(comp.config.title||comp.label)}/>;
      case 'table': return <SavedViewRuntime key={comp.id} view={views.find(view=>view.id===Number(comp.config.view_id))} title={comp.config.show_title===false?'':String(comp.config.title||comp.label)}/>;
      case 'chart': return <div key={comp.id} className="preview-comp preview-chart"><div className="preview-comp-header"><BarChart3 size={16}/><span>{comp.label}</span></div><div className="preview-chart-placeholder"><p>Gráfica #{String(comp.config.chart_id||'?')}</p></div></div>;
      case 'text': return <p key={comp.id} className="preview-comp preview-text" style={{textAlign:(comp.config.align as React.CSSProperties['textAlign'])||'left',fontSize:comp.config.size==='sm'?'13px':comp.config.size==='lg'?'18px':comp.config.size==='xl'?'24px':'15px'}}>{comp.config.content as string}</p>;
      case 'heading': return <div key={comp.id} className="preview-comp">{comp.config.level==='h1'?<h1>{comp.config.text as string}</h1>:comp.config.level==='h3'?<h3>{comp.config.text as string}</h3>:comp.config.level==='h4'?<h4>{comp.config.text as string}</h4>:<h2>{comp.config.text as string}</h2>}</div>;
      case 'image': return <div key={comp.id} className="preview-comp preview-image"><img src={comp.config.src as string} alt={comp.config.alt as string} style={{width:comp.config.width as string}}/></div>;
      case 'button': return <ActionButtonRuntime key={comp.id} component={comp} forms={forms} views={views}/>;
      case 'divider': return <hr key={comp.id} className="preview-comp preview-divider" style={{borderStyle:(comp.config.style as string)||'solid'}}/>;
      case 'spacer': return <div key={comp.id} className="preview-comp" style={{height:comp.config.height as number}}/>;
      case 'code': return <div key={comp.id} className="preview-comp preview-code"><pre><code>{comp.config.code as string}</code></pre></div>;
      case 'alert': return <div key={comp.id} className={`preview-comp preview-alert alert-${comp.config.type||'info'}`}>{comp.config.message as string}</div>;
      case 'badge': return <div key={comp.id} className="preview-comp"><span className="preview-badge-demo" style={{background:comp.config.color as string}}>{comp.config.label as string}</span></div>;
      case 'list': return <div key={comp.id} className="preview-comp preview-list"><div className="preview-comp-header"><ListOrdered size={16}/><span>{comp.label}</span></div><div className="preview-list-placeholder"><p>Lista → <code>{(comp.config.table_name as string)||'sin tabla'}</code></p></div></div>;
      case 'tabs': return <TabsRuntime key={comp.id} tabs={(comp.config.tabs as TabConfig[])||[]} forms={forms} views={views}/>;
      case 'columns': return <div key={comp.id} className="preview-comp preview-cols" style={{gridTemplateColumns:`repeat(${comp.config.columns||2},1fr)`}}>{Array.from({length:(comp.config.columns||2) as number}).map((_,i)=><div key={i} className="preview-col"><p className="muted">Columna {i+1}</p></div>)}</div>;
      case 'card': return <div key={comp.id} className="preview-comp preview-card"><div className="preview-card-header"><strong>{String(comp.config.title||'Card')}</strong>{Boolean(comp.config.subtitle)&&<small>{String(comp.config.subtitle)}</small>}</div><div className="preview-card-body"><p className="muted">Contenido de la card</p></div></div>;
      case 'table_detail': return <div key={comp.id} className="preview-comp preview-table-detail"><div className="preview-comp-header"><Table2 size={16}/><span>{comp.label}</span></div><div className="preview-detail-placeholder"><p>Detalle de tabla → <code>{(comp.config.table_name as string)||'sin tabla'}</code></p></div></div>;
      default: return <div key={comp.id} className="preview-comp preview-unknown"><FileText size={16}/><span>{comp.label}</span></div>;
    }
  });
}

function SavedFormRuntime({form,title}:{form?:BuilderForm;title?:string}){
  const [values,setValues]=useState<Record<string,unknown>>({});
  const [submitted,setSubmitted]=useState(false);
  if(!form)return <MissingComponent icon={FormInput} text="Selecciona un formulario creado"/>;
  const fields=form.fields.filter(field=>!['hidden','divider','heading','button'].includes(field.field_type));
  const errors=Object.fromEntries(fields.filter(field=>field.required&&!values[field.field_key]).map(field=>[field.field_key,`${field.label} es obligatorio`]));
  return <section className="runtime-form preview-comp">{title&&<div className="runtime-component-title"><FormInput size={16}/><div><strong>{title}</strong><small>{form.form_key} · {form.table_name}</small></div></div>}<div className="runtime-form-grid">{form.fields.map(field=><RuntimeField key={field.field_key} field={field} value={values[field.field_key]} error={submitted?errors[field.field_key]:''} onChange={value=>setValues(current=>({...current,[field.field_key]:value}))}/>)}</div><div className="runtime-form-actions"><button className="button ghost" onClick={()=>{setValues({});setSubmitted(false);}}>Limpiar</button><button className="button primary" onClick={()=>setSubmitted(true)}>{form.submit_label}</button></div></section>;
}

function RuntimeField({field,value,error,onChange}:{field:BuilderFormField;value:unknown;error?:string;onChange:(value:unknown)=>void}){
  const [remote,setRemote]=useState<{value:string|number;label:string}[]>([]);
  const relation=field.config?.options_source==='relation'; const relationTable=String(field.config?.relation_table??''); const valueColumn=String(field.config?.relation_value_column??'id'); const labelColumn=String(field.config?.relation_label_column??'');
  useEffect(()=>{if(relation&&relationTable&&labelColumn)api.lookupOptions(relationTable,valueColumn,labelColumn).then(setRemote).catch(()=>setRemote([]));},[relation,relationTable,valueColumn,labelColumn]);
  if(field.field_type==='heading')return <div className="runtime-heading" style={{gridColumn:`span ${field.width}`}}><h3>{field.label}</h3><p>{field.help_text}</p></div>;
  if(field.field_type==='divider')return <div className="runtime-divider" style={{gridColumn:`span ${field.width}`}}>{field.label&&<span>{field.label}</span>}</div>;
  if(field.field_type==='button')return <div style={{gridColumn:`span ${field.width}`}}><button className="button primary">{field.label}</button></div>;
  if(field.field_type==='hidden')return null;
  const options=relation?remote.map(option=>({value:String(option.value),label:option.label})):(field.options??[]).map(option=>({value:option,label:option}));
  return <label className={`runtime-field ${error?'invalid':''}`} style={{gridColumn:`span ${field.width}`}}><span>{field.label}{field.required&&<b> *</b>}</span>{field.field_type==='textarea'?<textarea rows={3} value={String(value??'')} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder??''}/>:field.field_type==='file'?<input type="file" onChange={e=>onChange(e.target.files?.[0]?.name??'')}/>:['select','multiselect','autocomplete'].includes(field.field_type)?<select value={String(value??'')} onChange={e=>onChange(e.target.value)}><option value="">{field.placeholder||'Seleccionar…'}</option>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:field.field_type==='radio'?<div className="runtime-options">{options.map(option=><label key={option.value}><input type="radio" checked={value===option.value} onChange={()=>onChange(option.value)}/>{option.label}</label>)}</div>:['checkbox','switch'].includes(field.field_type)?<label className="runtime-check"><input type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)}/><i/>{field.help_text||'Activar'}</label>:<input type={field.field_type==='datetime'?'datetime-local':field.field_type} value={String(value??'')} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder??''}/>} {field.help_text&&!['checkbox','switch'].includes(field.field_type)&&<small>{field.help_text}</small>}{error&&<em>{error}</em>}</label>;
}

function SavedViewRuntime({view,title}:{view?:BuilderView;title?:string}){
  const [rows,setRows]=useState<Record<string,unknown>[]>([]); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(false);
  useEffect(()=>{if(!view)return;setLoading(true);api.browse(view.table_name,1,search).then(page=>setRows(page.data.slice(0,view.per_page))).catch(()=>setRows([])).finally(()=>setLoading(false));},[view,search]);
  if(!view)return <MissingComponent icon={Table2} text="Selecciona una vista de tabla creada"/>;
  const settings=(view.settings??{}) as Record<string,boolean>; const columns=view.columns.filter(column=>column.visible);
  return <section className="runtime-view preview-comp">{title&&<div className="runtime-component-title"><Table2 size={16}/><div><strong>{title}</strong><small>{view.view_key} · ID: {view.primary_key}</small></div></div>}<div className="runtime-view-toolbar">{settings.search&&<div><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar registros…"/></div>}{settings.create&&<button className="button primary"><Plus size={14}/>Nuevo</button>}</div><div className="runtime-table-wrap"><table><thead><tr>{columns.map(column=><th key={column.column_key}>{column.label}</th>)}{(settings.edit||settings.delete)&&<th>Acciones</th>}</tr></thead><tbody>{loading?<tr><td colSpan={columns.length+1}>Cargando datos…</td></tr>:rows.length?rows.map((row,index)=><tr key={String(row[view.primary_key]??index)}>{columns.map(column=><td key={column.column_key}>{formatRuntimeCell(row[column.column_key],column)}</td>)}{(settings.edit||settings.delete)&&<td><div className="runtime-row-actions">{settings.edit&&<button>Editar</button>}{settings.delete&&<button>Eliminar</button>}</div></td>}</tr>):<tr><td colSpan={columns.length+1}>Sin registros para mostrar</td></tr>}</tbody></table></div></section>;
}

function ActionButtonRuntime({component,forms,views}:{component:PageComponent;forms:BuilderForm[];views:BuilderView[]}){
  const [open,setOpen]=useState(false); const action=String(component.config.action??'none');
  const click=()=>{if(action==='modal')setOpen(true);else if(action==='url'&&component.config.url)window.location.hash=String(component.config.url);};
  return <div className="preview-comp runtime-button"><button className={`button ${component.config.variant||'primary'}`} onClick={click}>{String(component.config.label||component.label)}</button>{open&&<div className="runtime-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setOpen(false)}><section className="runtime-modal"><header><div><span>Componente del proyecto</span><h2>{String(component.config.modal_title||component.config.label||component.label)}</h2></div><button onClick={()=>setOpen(false)}><X size={18}/></button></header><div className="runtime-modal-body">{component.config.modal_type==='view'?<SavedViewRuntime view={views.find(view=>view.id===Number(component.config.modal_id))}/>:<SavedFormRuntime form={forms.find(form=>form.id===Number(component.config.modal_id))}/>}</div></section></div>}</div>;
}

function TabsRuntime({tabs,forms,views}:{tabs:TabConfig[];forms:BuilderForm[];views:BuilderView[]}){
  const [active,setActive]=useState(0); const tab=tabs[active];
  return <section className="preview-comp runtime-tabs"><div className="preview-tabs-bar">{tabs.map((item,index)=><button key={`${item.label}-${index}`} className={active===index?'active':''} onClick={()=>setActive(index)}>{item.label}</button>)}</div><div className="preview-tabs-content">{!tab?<p className="muted">Agrega una pestaña</p>:tab.content_type==='view'?<SavedViewRuntime view={views.find(view=>view.id===Number(tab.resource_id))}/>:<SavedFormRuntime form={forms.find(form=>form.id===Number(tab.resource_id))}/>}</div></section>;
}

function MissingComponent({icon:Icon,text}:{icon:typeof Table2;text:string}){return <div className="preview-comp runtime-missing"><Icon size={24}/><span>{text}</span></div>;}
function formatRuntimeCell(value:unknown,column:BuilderViewColumn){if(value===null||value===undefined)return'—';if(column.display_type==='boolean')return Number(value)?'Sí':'No';if(column.display_type==='money')return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(value));if(column.display_type==='json')return typeof value==='string'?value:JSON.stringify(value);return String(value);}

import { useEffect, useState } from 'react';
import { BarChart3, Blocks, Braces, Code2, Database, FolderTree, LayoutList, LoaderCircle, Menu, Plus, RefreshCw, ShieldCheck, Table2, X } from 'lucide-react';
import { api } from './api/client';
import { ChartsStudio } from './components/ChartsStudio';
import { CodeStudio } from './components/CodeStudio';
import { FieldPanel } from './components/FieldPanel';
import { MenuBuilder } from './components/MenuBuilder';
import { ModuleModal } from './components/ModuleModal';
import { RecordsView } from './components/RecordsView';
import { RolesPermissions } from './components/RolesPermissions';
import { SchemaExplorer } from './components/SchemaExplorer';
import type { Module } from './types';

type Section = 'explorer'|'module'|'menus'|'roles'|'charts'|'code';

const NAV: {key:Section;label:string;icon:typeof Database}[] = [
  {key:'explorer',label:'Base de datos',icon:Database},
  {key:'module',label:'Módulos y datos',icon:Table2},
  {key:'menus',label:'Menús y rutas',icon:FolderTree},
  {key:'roles',label:'Roles y permisos',icon:ShieldCheck},
  {key:'charts',label:'Gráficas',icon:BarChart3},
  {key:'code',label:'Constructor de código',icon:Code2},
];

export default function App(){
  const [modules,setModules]=useState<Module[]>([]); const [selectedId,setSelectedId]=useState<number|null>(null);
  const [section,setSection]=useState<Section>('explorer'); const [newModule,setNewModule]=useState(false);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [mobileNav,setMobileNav]=useState(false);
  const selected=modules.find(m=>m.id===selectedId)??null;
  async function load(){setLoading(true);setError('');try{const data=await api.modules();setModules(data);setSelectedId(current=>current&&data.some(m=>m.id===current)?current:data[0]?.id??null)}catch(err){setError((err as Error).message)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  function pick(id:number){setSelectedId(id);setSection('module');setMobileNav(false)}
  function go(s:Section){setSection(s);setMobileNav(false)}

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Blocks size={22}/></div><div><strong>NexoDB</strong><span>Studio</span></div><button className="mobile-close" onClick={()=>setMobileNav(false)}><X/></button></div>
      <button className="button new-module" onClick={()=>setNewModule(true)}><Plus size={17}/>Nuevo módulo</button>
      <nav className="module-nav" aria-label="Navegación principal">
        <span className="nav-title">Plataforma</span>
        {NAV.map(({key,label,icon:Icon})=><button key={key} className={section===key?'active':''} onClick={()=>go(key)}><span className="module-icon"><Icon size={16}/></span><span><strong>{label}</strong></span></button>)}
        <span className="nav-title" style={{marginTop:14}}>Módulos</span>
        {modules.map(module=><button key={module.id} className={section==='module'&&selectedId===module.id?'active':''} onClick={()=>pick(module.id)}><span className="module-icon"><Database size={16}/></span><span><strong>{module.name}</strong><small>{module.fields.length} campos</small></span></button>)}
        {!loading&&!modules.length&&<p className="sidebar-empty">No hay módulos todavía.</p>}
      </nav>
      <div className="sidebar-foot"><div className="safe-dot"/><div><strong>Modo protegido</strong><span>Tablas con prefijo nx_</span></div></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)}><Menu/></button>
        <div className="crumb"><span>NexoDB</span><b>/</b><strong>{NAV.find(n=>n.key===section)?.label??'Inicio'}{section==='module'&&selected?` · ${selected.name}`:''}</strong></div>
        <button className="icon-button" style={{marginLeft:'auto'}} onClick={()=>void load()} aria-label="Recargar"><RefreshCw size={18}/></button>
      </header>
      {loading&&!modules.length?<div className="center-state"><LoaderCircle className="spin"/><p>Conectando con el constructor…</p></div>:
       error?<div className="center-state error-state"><Database/><h2>No se pudo conectar con Laravel</h2><p>{error}</p><button className="button primary" onClick={()=>void load()}>Reintentar</button></div>:
       <div className="content">
        {section==='explorer'&&<SchemaExplorer/>}
        {section==='menus'&&<MenuBuilder modules={modules} charts={[]}/>}
        {section==='roles'&&<RolesPermissions modules={modules}/>}
        {section==='charts'&&<ChartsStudio modules={modules}/>}
        {section==='code'&&<CodeStudio modules={modules}/>}
        {section==='module'&&(selected?
          <div className="module-view">
            <section className="module-hero"><div><span className="eyebrow"><Database size={14}/>Tabla física · {selected.table_name}</span><h1>{selected.name}</h1><p>{selected.description||'Módulo sin descripción.'}</p></div>
              <div className="module-stats"><div><b>{selected.fields.length}</b><span>Campos</span></div><div><b>{selected.fields.filter(f=>f.show_in_form).length}</b><span>En formulario</span></div><div><b>{selected.fields.filter(f=>f.show_in_table).length}</b><span>En tabla</span></div></div>
            </section>
            <ModuleWorkspace key={selected.id} module={selected} modules={modules} onRefresh={load}/>
          </div>:
          <div className="welcome"><div className="welcome-icon"><Braces/></div><span className="kicker">Constructor low-code</span><h1>Tu base de datos se convierte en una aplicación.</h1><p>Crea el primer módulo. Después define sus campos, relaciones, formatos y vistas.</p><button className="button primary large" onClick={()=>setNewModule(true)}><Plus/>Crear mi primer módulo</button></div>)}
      </div>}
    </main>
    {newModule&&<ModuleModal onClose={()=>setNewModule(false)} onCreated={module=>{setModules(v=>[...v,module]);setSelectedId(module.id);setSection('module');setNewModule(false)}}/>}
  </div>;
}

function ModuleWorkspace({module,modules,onRefresh}:{module:Module;modules:Module[];onRefresh:()=>Promise<void>}){
  const [view,setView]=useState<'records'|'designer'>('records');
  return <>
    <div className="view-tabs"><button className={view==='records'?'active':''} onClick={()=>setView('records')}><Table2 size={17}/>Datos</button><button className={view==='designer'?'active':''} onClick={()=>setView('designer')}><LayoutList size={17}/>Diseñar módulo</button></div>
    {view==='records'?<RecordsView module={module}/>:<FieldPanel module={module} modules={modules} onRefresh={onRefresh}/>}
  </>;
}

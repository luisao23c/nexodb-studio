import { useEffect, useState } from 'react';
import { Blocks, Braces, Database, LayoutList, LoaderCircle, Menu, Plus, RefreshCw, Table2, X } from 'lucide-react';
import { api } from './api/client';
import { FieldPanel } from './components/FieldPanel';
import { ModuleModal } from './components/ModuleModal';
import { RecordsView } from './components/RecordsView';
import type { Module } from './types';

type View = 'records'|'designer';

export default function App(){
  const [modules,setModules]=useState<Module[]>([]); const [selectedId,setSelectedId]=useState<number|null>(null); const [view,setView]=useState<View>('records'); const [newModule,setNewModule]=useState(false); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [mobileNav,setMobileNav]=useState(false);
  const selected=modules.find(m=>m.id===selectedId)??null;
  async function load(){setLoading(true);setError('');try{const data=await api.modules();setModules(data);setSelectedId(current=>current&&data.some(m=>m.id===current)?current:data[0]?.id??null)}catch(err){setError((err as Error).message)}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  function select(id:number){setSelectedId(id);setMobileNav(false)}
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Blocks size={22}/></div><div><strong>NexoDB</strong><span>Studio</span></div><button className="mobile-close" onClick={()=>setMobileNav(false)}><X/></button></div>
      <button className="button new-module" onClick={()=>setNewModule(true)}><Plus size={17}/>Crear módulo</button>
      <nav className="module-nav"><span className="nav-title">Módulos</span>{modules.map(module=><button key={module.id} className={selectedId===module.id?'active':''} onClick={()=>select(module.id)}><span className="module-icon"><Database size={16}/></span><span><strong>{module.name}</strong><small>{module.fields.length} campos</small></span></button>)}{!loading&&!modules.length&&<p className="sidebar-empty">No hay módulos todavía.</p>}</nav>
      <div className="sidebar-foot"><div className="safe-dot"/><div><strong>Modo protegido</strong><span>Tablas con prefijo nx_</span></div></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)}><Menu/></button><div className="crumb"><span>Constructor</span><b>/</b><strong>{selected?.name??'Inicio'}</strong></div><button className="icon-button" onClick={()=>void load()} aria-label="Recargar"><RefreshCw size={18}/></button></header>
      {loading&&!modules.length?<div className="center-state"><LoaderCircle className="spin"/><p>Conectando con el constructor…</p></div>:error?<div className="center-state error-state"><Database/><h2>No se pudo conectar con Laravel</h2><p>{error}</p><button className="button primary" onClick={()=>void load()}>Reintentar</button></div>:!selected?<div className="welcome"><div className="welcome-icon"><Braces/></div><span className="kicker">Constructor low-code</span><h1>Tu base de datos se convierte en una aplicación.</h1><p>Crea el primer módulo. Después define sus campos, relaciones, formulario y columnas visibles.</p><button className="button primary large" onClick={()=>setNewModule(true)}><Plus/>Crear mi primer módulo</button><div className="steps"><div><b>01</b><strong>Tabla</strong><span>Define el módulo y sus campos.</span></div><div><b>02</b><strong>Interfaz</strong><span>Elige inputs, relaciones y visibilidad.</span></div><div><b>03</b><strong>CRUD</strong><span>Captura y consulta datos reales.</span></div></div></div>:<div className="content">
        <section className="module-hero"><div><span className="eyebrow"><Database size={14}/>Tabla física · {selected.table_name}</span><h1>{selected.name}</h1><p>{selected.description||'Módulo sin descripción.'}</p></div><div className="module-stats"><div><b>{selected.fields.length}</b><span>Campos</span></div><div><b>{selected.fields.filter(f=>f.show_in_form).length}</b><span>En formulario</span></div><div><b>{selected.fields.filter(f=>f.show_in_table).length}</b><span>En tabla</span></div></div></section>
        <div className="view-tabs"><button className={view==='records'?'active':''} onClick={()=>setView('records')}><Table2 size={17}/>Datos</button><button className={view==='designer'?'active':''} onClick={()=>setView('designer')}><LayoutList size={17}/>Diseñar módulo</button></div>
        {view==='records'?<RecordsView module={selected}/>:<FieldPanel module={selected} modules={modules} onRefresh={load}/>}</div>}
    </main>
    {newModule&&<ModuleModal onClose={()=>setNewModule(false)} onCreated={module=>{setModules(v=>[...v,module]);setSelectedId(module.id);setView('designer');setNewModule(false)}}/>}
  </div>
}

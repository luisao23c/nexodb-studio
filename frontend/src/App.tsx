import { useEffect, useState } from 'react';
import { BarChart3, Blocks, Code2, Database, FolderTree, Menu, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { api } from './api/client';
import { ChartsStudio } from './components/ChartsStudio';
import { CodeStudio } from './components/CodeStudio';
import { MenuBuilder } from './components/MenuBuilder';
import { RolesPermissions } from './components/RolesPermissions';
import { SchemaExplorer } from './components/SchemaExplorer';
import type { SchemaTable } from './types';

type Section = 'explorer'|'menus'|'roles'|'charts'|'code';

const NAV: {key:Section;label:string;description:string;icon:typeof Database}[] = [
  {key:'explorer',label:'Base de datos',description:'Tablas, datos y SQL',icon:Database},
  {key:'menus',label:'Menús y rutas',description:'Navegación de la app',icon:FolderTree},
  {key:'roles',label:'Roles y permisos',description:'Acceso por tabla',icon:ShieldCheck},
  {key:'charts',label:'Gráficas',description:'Indicadores en vivo',icon:BarChart3},
  {key:'code',label:'Constructor de código',description:'Páginas personalizadas',icon:Code2},
];

export default function App(){
  const [tables,setTables]=useState<SchemaTable[]>([]);
  const [section,setSection]=useState<Section>('explorer');
  const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [mobileNav,setMobileNav]=useState(false);

  async function load(){setLoading(true);setError('');try{setTables((await api.schemaTables()).tables);}catch(err){setError((err as Error).message);}finally{setLoading(false);}}
  useEffect(()=>{void load();},[]);
  function go(next:Section){setSection(next);setMobileNav(false);}
  const current= NAV.find(item=>item.key===section)!;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Blocks size={22}/></div><div><strong>NexoDB</strong><span>Studio</span></div><button className="mobile-close" onClick={()=>setMobileNav(false)} aria-label="Cerrar navegación"><X/></button></div>
      <div className="workspace-badge"><span className="workspace-badge-icon"><Database size={15}/></span><div><strong>Data workspace</strong><small>{tables.length} tablas conectadas</small></div><span className="live-dot"/></div>
      <nav className="module-nav" aria-label="Navegación principal">
        <span className="nav-title">Herramientas</span>
        {NAV.map(({key,label,description,icon:Icon})=><button key={key} className={section===key?'active':''} onClick={()=>go(key)}><span className="module-icon"><Icon size={16}/></span><span><strong>{label}</strong><small>{description}</small></span></button>)}
      </nav>
      <div className="sidebar-foot"><div className="safe-dot"/><div><strong>Entorno protegido</strong><span>Operaciones limitadas a nx_</span></div></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Abrir navegación"><Menu/></button>
        <div className="page-heading"><span>NexoDB Studio</span><strong>{current.label}</strong></div>
        <div className="topbar-actions"><span className="connection-status"><i/>Conectado</span><button className="icon-button" onClick={()=>void load()} aria-label="Recargar"><RefreshCw size={17}/></button></div>
      </header>
      {loading&&!tables.length?<div className="center-state"><RefreshCw className="spin"/><p>Conectando con la base de datos…</p></div>:
       error?<div className="center-state error-state"><Database/><h2>No se pudo conectar con Laravel</h2><p>{error}</p><button className="button primary" onClick={()=>void load()}>Reintentar</button></div>:
       <div className={`content ${section==='explorer'?'database-content':''}`}>
        {section==='explorer'&&<SchemaExplorer onChanged={load}/>}
        {section==='menus'&&<MenuBuilder tables={tables}/>}
        {section==='roles'&&<RolesPermissions tables={tables}/>}
        {section==='charts'&&<ChartsStudio tables={tables}/>}
        {section==='code'&&<CodeStudio tables={tables}/>}
      </div>}
    </main>
  </div>;
}

import { useEffect, useState } from 'react';
import { BarChart3, Blocks, ChevronRight, Code2, Database, FolderTree, FormInput, Menu, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { api } from './api/client';
import { ChartsStudio } from './components/ChartsStudio';
import { CodeStudio } from './components/CodeStudio';
import { MenuBuilder } from './components/MenuBuilder';
import { RolesPermissions } from './components/RolesPermissions';
import { SchemaExplorer } from './components/SchemaExplorer';
import { InterfaceStudio } from './components/InterfaceStudio';
import type { SchemaTable } from './types';

type Section = 'explorer'|'interfaces'|'menus'|'roles'|'charts'|'code';

const NAV: {key:Section;label:string;description:string;group:'Diseña'|'Construye'|'Controla';icon:typeof Database}[] = [
  {key:'explorer',label:'Modelo de datos',description:'Tablas, campos y relaciones',group:'Diseña',icon:Database},
  {key:'interfaces',label:'Interfaces',description:'Formularios y vistas de tabla',group:'Diseña',icon:FormInput},
  {key:'menus',label:'Navegación',description:'Menús y rutas de la app',group:'Construye',icon:FolderTree},
  {key:'charts',label:'Indicadores',description:'Gráficas con datos reales',group:'Construye',icon:BarChart3},
  {key:'code',label:'Páginas',description:'Vistas personalizadas',group:'Construye',icon:Code2},
  {key:'roles',label:'Accesos',description:'Roles y permisos por tabla',group:'Controla',icon:ShieldCheck},
];

const SECTION_COPY: Record<Exclude<Section,'explorer'>,{step:string;title:string;description:string}> = {
  interfaces:{step:'Diseña · Paso 2',title:'Construye la experiencia de captura',description:'Crea formularios y vistas profesionales reutilizables, identificados con una key única.'},
  menus:{step:'Construye · Paso 1',title:'Organiza la navegación',description:'Decide qué verá el usuario y a dónde lo llevará cada opción del menú.'},
  charts:{step:'Construye · Paso 2',title:'Convierte datos en indicadores',description:'Crea gráficas conectadas a tus tablas para explicar la información de un vistazo.'},
  code:{step:'Construye · Paso 3',title:'Diseña páginas especiales',description:'Añade vistas personalizadas cuando una tabla o una gráfica no sean suficientes.'},
  roles:{step:'Controla',title:'Define quién puede hacer qué',description:'Asigna permisos de lectura, creación, edición y eliminación por cada tabla.'},
};

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
      <div className="workspace-badge"><span className="workspace-badge-icon"><Database size={15}/></span><div><strong>Proyecto actual</strong><small>{tables.length} tablas conectadas</small></div><span className="live-dot"/></div>
      <nav className="module-nav" aria-label="Navegación principal">
        {(['Diseña','Construye','Controla'] as const).map(group=><div className="nav-group" key={group}>
          <span className="nav-title">{group}</span>
          {NAV.filter(item=>item.group===group).map(({key,label,description,icon:Icon})=><button key={key} className={section===key?'active':''} onClick={()=>go(key)}><span className="module-icon"><Icon size={16}/></span><span><strong>{label}</strong><small>{description}</small></span>{section===key&&<ChevronRight className="nav-arrow" size={15}/>}</button>)}
        </div>)}
      </nav>
      <div className="sidebar-foot"><div className="safe-dot"/><div><strong>Espacio protegido</strong><span>Solo administra tablas nx_</span></div></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Abrir navegación"><Menu/></button>
        <div className="page-heading"><span>Proyecto <ChevronRight size={12}/></span><strong>{current.label}</strong></div>
        <div className="topbar-actions"><span className="connection-status"><i/>Base conectada</span><span className="topbar-hint"><Sparkles size={14}/>Cambios en tiempo real</span><button className="icon-button" onClick={()=>void load()} aria-label="Recargar datos" title="Recargar datos"><RefreshCw size={17}/></button></div>
      </header>
      {loading&&!tables.length?<div className="center-state"><RefreshCw className="spin"/><p>Conectando con la base de datos…</p></div>:
       error?<div className="center-state error-state"><Database/><h2>No se pudo conectar con Laravel</h2><p>{error}</p><button className="button primary" onClick={()=>void load()}>Reintentar</button></div>:
       <div className={`content ${section==='explorer'?'database-content':''}`}>
        {section!=='explorer'&&<div className="section-intro"><span className="kicker">{SECTION_COPY[section].step}</span><h1>{SECTION_COPY[section].title}</h1><p>{SECTION_COPY[section].description}</p></div>}
        {section==='explorer'&&<SchemaExplorer onChanged={load}/>}
        {section==='interfaces'&&<InterfaceStudio tables={tables}/>}
        {section==='menus'&&<MenuBuilder tables={tables}/>}
        {section==='roles'&&<RolesPermissions tables={tables}/>}
        {section==='charts'&&<ChartsStudio tables={tables}/>}
        {section==='code'&&<CodeStudio tables={tables}/>}
      </div>}
    </main>
  </div>;
}

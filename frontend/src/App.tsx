import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Blocks, ChevronRight, Code2, Database, FolderTree, FormInput, Layout, Menu, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { api, setCurrentProjectId as setApiCurrentProjectId } from './api/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProjectSwitcher } from './components/ProjectSwitcher';
import type { Project, SchemaTable } from './types';

const SchemaExplorer = lazy(() => import('./components/SchemaExplorer').then((m) => ({ default: m.SchemaExplorer })));
const InterfaceStudio = lazy(() => import('./components/InterfaceStudio').then((m) => ({ default: m.InterfaceStudio })));
const ProjectBuilder = lazy(() => import('./components/ProjectBuilder'));
const MenuBuilder = lazy(() => import('./components/MenuBuilder').then((m) => ({ default: m.MenuBuilder })));
const RolesPermissions = lazy(() => import('./components/RolesPermissions').then((m) => ({ default: m.RolesPermissions })));
const ChartsStudio = lazy(() => import('./components/ChartsStudio').then((m) => ({ default: m.ChartsStudio })));
const CodeStudio = lazy(() => import('./components/CodeStudio').then((m) => ({ default: m.CodeStudio })));
const PublishedPreview = lazy(() => import('./components/PublishedPreview').then((m) => ({ default: m.PublishedPreview })));

const CURRENT_PROJECT_KEY = 'nexodb.currentProjectId';

type Section = 'explorer'|'interfaces'|'menus'|'roles'|'charts'|'code'|'builder';

const NAV: {key:Section;label:string;description:string;group:'Diseña'|'Construye'|'Controla';icon:typeof Database}[] = [
  {key:'explorer',label:'Modelo de datos',description:'Tablas, campos y relaciones',group:'Diseña',icon:Database},
  {key:'interfaces',label:'Interfaces',description:'Formularios y vistas de tabla',group:'Diseña',icon:FormInput},
  {key:'builder',label:'Constructor',description:'Rutas, páginas y preview del proyecto',group:'Construye',icon:Layout},
  {key:'menus',label:'Navegación',description:'Menús y rutas de la app',group:'Construye',icon:FolderTree},
  {key:'charts',label:'Indicadores',description:'Gráficas con datos reales',group:'Construye',icon:BarChart3},
  {key:'code',label:'Páginas',description:'Vistas personalizadas',group:'Construye',icon:Code2},
  {key:'roles',label:'Accesos',description:'Roles y permisos por tabla',group:'Controla',icon:ShieldCheck},
];

const SECTION_COPY: Record<Exclude<Section,'explorer'>,{step:string;title:string;description:string}> = {
  interfaces:{step:'Diseña · Paso 2',title:'Construye la experiencia de captura',description:'Crea formularios y vistas profesionales reutilizables, identificados con una key única.'},
  builder:{step:'Construye · Proyecto',title:'Constructor de Proyectos',description:'Crea rutas anidadas, configura contenido (tablas, formularios, gráficas) y previewea tu proyecto en tiempo real.'},
  menus:{step:'Construye · Paso 1',title:'Organiza la navegación',description:'Decide qué verá el usuario y a dónde lo llevará cada opción del menú.'},
  charts:{step:'Construye · Paso 2',title:'Convierte datos en indicadores',description:'Crea gráficas conectadas a tus tablas para explicar la información de un vistazo.'},
  code:{step:'Construye · Paso 3',title:'Diseña páginas especiales',description:'Añade vistas personalizadas cuando una tabla o una gráfica no sean suficientes.'},
  roles:{step:'Controla',title:'Define quién puede hacer qué',description:'Asigna permisos de lectura, creación, edición y eliminación por cada tabla.'},
};

function ViewFallback() {
  return <div className="center-state small"><RefreshCw className="spin"/><p>Cargando vista…</p></div>;
}

function Shell({tables,loading,error,onReload,projects,currentProjectId,onChangeProject,onProjectsChange}:{tables:SchemaTable[];loading:boolean;error:string;onReload:()=>void;projects:Project[];currentProjectId:number|null;onChangeProject:(id:number)=>void;onProjectsChange:(projects:Project[])=>void}){
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNav,setMobileNav] = useState(false);
  const section = (location.pathname.replace(/^\//,'').split('/')[0] || 'explorer') as Section;
  const current = NAV.find(item=>item.key===section) ?? NAV[0];
  const currentProject = projects.find(p=>p.id===currentProjectId) ?? null;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Blocks size={22}/></div><div><strong>NexoDB</strong><span>Studio</span></div><button className="mobile-close" onClick={()=>setMobileNav(false)} aria-label="Cerrar navegación"><X/></button></div>
      <div className="workspace-badge"><span className="workspace-badge-icon"><Database size={15}/></span><div><ProjectSwitcher projects={projects} currentId={currentProjectId} onChange={onChangeProject} onProjectsChange={onProjectsChange}/><small>{tables.length} tablas conectadas</small></div><span className="live-dot"/></div>
      <nav className="module-nav" aria-label="Navegación principal">
        {(['Diseña','Construye','Controla'] as const).map(group=><div className="nav-group" key={group}>
          <span className="nav-title">{group}</span>
          {NAV.filter(item=>item.group===group).map(({key,label,description,icon:Icon})=><button key={key} className={section===key?'active':''} onClick={()=>{navigate(`/${key}`);setMobileNav(false);}}><span className="module-icon"><Icon size={16}/></span><span><strong>{label}</strong><small>{description}</small></span>{section===key&&<ChevronRight className="nav-arrow" size={15}/>}</button>)}
        </div>)}
      </nav>
      <div className="sidebar-foot"><div className="safe-dot"/><div><strong>Espacio protegido</strong><span>Solo administra tablas nx_</span></div></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Abrir navegación"><Menu/></button>
        <div className="page-heading"><span>Proyecto <ChevronRight size={12}/></span><strong>{current.label}</strong></div>
        <div className="topbar-actions"><span className="connection-status"><i/>Base conectada</span><span className="topbar-hint"><Sparkles size={14}/>Cambios en tiempo real</span><button className="icon-button" onClick={onReload} aria-label="Recargar datos" title="Recargar datos"><RefreshCw size={17}/></button></div>
      </header>
      {loading&&!tables.length?<div className="center-state"><RefreshCw className="spin"/><p>Conectando con la base de datos…</p></div>:
       error?<div className="center-state error-state"><Database/><h2>No se pudo conectar con Laravel</h2><p>{error}</p><button className="button primary" onClick={onReload}>Reintentar</button></div>:
       <div className={`content ${section==='explorer'?'database-content':''}`}>
        {section!=='explorer'&&<div className="section-intro"><span className="kicker">{SECTION_COPY[section].step}</span><h1>{SECTION_COPY[section].title}</h1><p>{SECTION_COPY[section].description}</p></div>}
        <ErrorBoundary key={`${location.pathname}-${currentProjectId}`}>
          <Suspense fallback={<ViewFallback/>}>
            <Routes>
              <Route path="/" element={<Navigate to="/explorer" replace/>}/>
              <Route path="/explorer" element={<SchemaExplorer onChanged={onReload}/>}/>
              <Route path="/interfaces" element={<InterfaceStudio tables={tables}/>}/>
              <Route path="/builder" element={<ProjectBuilder project={currentProject}/>}/>
              <Route path="/menus" element={<MenuBuilder tables={tables}/>}/>
              <Route path="/roles" element={<RolesPermissions tables={tables}/>}/>
              <Route path="/charts" element={<ChartsStudio tables={tables}/>}/>
              <Route path="/code" element={<CodeStudio tables={tables}/>}/>
              <Route path="*" element={<Navigate to="/explorer" replace/>}/>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>}
    </main>
  </div>;
}

export default function App(){
  const [tables,setTables]=useState<SchemaTable[]>([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const [projects,setProjects]=useState<Project[]>([]);
  const [currentProjectId,setCurrentProjectId]=useState<number|null>(null);

  async function load(){setLoading(true);setError('');try{
    const [schema,projectList] = await Promise.all([api.schemaTables(),api.projects()]);
    setTables(schema.tables);
    setProjects(projectList);
    setCurrentProjectId(prev=>{
      if(prev && projectList.some(p=>p.id===prev))return prev;
      const stored = Number(localStorage.getItem(CURRENT_PROJECT_KEY));
      return projectList.find(p=>p.id===stored)?.id ?? projectList[0]?.id ?? null;
    });
  }catch(err){setError((err as Error).message);}finally{setLoading(false);}}
  useEffect(()=>{void load();},[]);

  useEffect(()=>{
    setApiCurrentProjectId(currentProjectId);
    if(currentProjectId!==null)localStorage.setItem(CURRENT_PROJECT_KEY,String(currentProjectId));
  },[currentProjectId]);

  return <HashRouter>
    <Routes>
      <Route path="/preview/:projectId/*" element={<Suspense fallback={<ViewFallback/>}><PublishedPreview/></Suspense>}/>
      <Route path="/*" element={<Shell tables={tables} loading={loading} error={error} onReload={()=>void load()} projects={projects} currentProjectId={currentProjectId} onChangeProject={setCurrentProjectId} onProjectsChange={setProjects}/>}/>
    </Routes>
  </HashRouter>;
}

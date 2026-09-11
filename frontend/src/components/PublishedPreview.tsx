import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DatabaseZap, Layout, LoaderCircle } from 'lucide-react';
import { api, setPreviewMode } from '../api/client';
import { renderComponents, type PageComponent } from './ComponentPalette';
import { findFirstVisibleRoute } from './ProjectBuilder';
import type { BuilderForm, BuilderRoute, BuilderView } from '../types';

/** Standalone, unauthenticated, chrome-free preview of a project marked as public. Reachable at /#/preview/:projectId. */
export function PublishedPreview() {
  const { projectId } = useParams<{ projectId: string }>();
  const [routes, setRoutes] = useState<BuilderRoute[]>([]);
  const [paths, setPaths] = useState<Record<number, string>>({});
  const [forms, setForms] = useState<BuilderForm[]>([]);
  const [views, setViews] = useState<BuilderView[]>([]);
  const [activePath, setActivePath] = useState('/');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [meta,setMeta]=useState<{name:string;version?:string|null;writable:boolean}>({name:'Proyecto',writable:false});

  useEffect(() => {
    const id = Number(projectId);
    if (!id) { setNotFound(true); setLoading(false); return; }
    setPreviewMode(id);

    void (async () => {
      try {
        const [routesRes, formsRes, viewsRes] = await Promise.all([api.routesPreview(), api.forms(), api.views()]);
        setRoutes(routesRes.routes);
        setPaths(routesRes.paths);
        setForms(formsRes);
        setViews(viewsRes);
        setMeta({name:routesRes.project?.name??'Proyecto',version:routesRes.version,writable:Boolean(routesRes.project?.preview_writes_enabled)});
        const first = findFirstVisibleRoute(routesRes.routes);
        if (first) setActivePath(routesRes.paths[first.id] || '/');
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();

    return () => setPreviewMode(null);
  }, [projectId]);

  useEffect(()=>{const navigate=(event:Event)=>{const detail=(event as CustomEvent<{path?:string;routeId?:number|null}>).detail;const target=detail?.routeId?paths[detail.routeId]:detail?.path;if(target&&Object.values(paths).includes(target))setActivePath(target);};window.addEventListener('nexodb:navigate',navigate);return()=>window.removeEventListener('nexodb:navigate',navigate);},[paths]);

  function buildNav(items: BuilderRoute[], depth = 0) {
    return <ul className="preview-nav-list" style={{ paddingLeft: depth * 16 }}>
      {items.filter((r) => r.visible_in_menu && r.active).map((r) => <li key={r.id}>
        <button className={`preview-nav-item ${activePath === paths[r.id] ? 'active' : ''}`} onClick={() => setActivePath(paths[r.id] || '/')}>
          {r.name}{r.badge_label && <span className="preview-badge" style={{ background: r.badge_color || '#6366f1' }}>{r.badge_label}</span>}
        </button>
        {r.children && r.children.length > 0 && buildNav(r.children, depth + 1)}
      </li>)}
    </ul>;
  }

  function renderContent() {
    const findRoute = (items: BuilderRoute[]): BuilderRoute | null => {
      for (const r of items) {
        if (paths[r.id] === activePath) return r;
        if (r.children) { const found = findRoute(r.children); if (found) return found; }
      }
      return null;
    };
    const route = findRoute(routes);
    if (!route) return <div className="preview-empty"><Layout size={48}/><p>Selecciona una sección del menú</p></div>;

    const comps = (route.content_config?.components as PageComponent[]) || [];
    if (comps.length > 0) return <div className="preview-content"><h2>{route.name}</h2>{renderComponents(comps, forms, views)}</div>;

    switch (route.content_type) {
      case 'table': return <div className="preview-content"><h2>{route.name}</h2>{renderComponents([{ id: `route-view-${route.id}`, type: 'table', label: route.name, config: { view_id: route.content_config?.view_id, show_title: false } }], forms, views)}</div>;
      case 'form': return <div className="preview-content"><h2>{route.name}</h2>{renderComponents([{ id: `route-form-${route.id}`, type: 'form', label: route.name, config: { form_id: route.content_config?.form_id, show_title: false } }], forms, views)}</div>;
      case 'chart': return <div className="preview-content"><h2>{route.name}</h2>{renderComponents([{ id: `route-chart-${route.id}`, type: 'chart', label: route.name, config: { chart_id: route.content_config?.chart_id, title: route.name } }], forms, views)}</div>;
      case 'divider': return <hr className="preview-divider"/>;
      default: return <div className="preview-content preview-empty-state"><Layout size={48}/><h2>{route.name}</h2></div>;
    }
  }

  if (loading) return <div className="center-state"><LoaderCircle className="spin"/><p>Cargando…</p></div>;
  if (notFound) return <div className="center-state"><Layout size={48}/><h2>Vista previa no disponible</h2><p>Este proyecto no existe o no tiene un preview público activo.</p></div>;

  return <div className="published-preview">
    <div className="preview-sidebar"><div className="preview-site-brand"><span>N</span><div><strong>{meta.name}</strong><small>{meta.version?`Versión ${meta.version}`:'Preview en desarrollo'}</small></div></div>{buildNav(routes)}<div className={`published-runtime-status ${meta.writable?'live':''}`}><DatabaseZap size={13}/><span>{meta.writable?'Sistema funcional':'Solo lectura'}</span></div></div>
    <main className="preview-main">{renderContent()}</main>
  </div>;
}

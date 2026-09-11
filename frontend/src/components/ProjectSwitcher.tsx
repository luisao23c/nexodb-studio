import { Check, ChevronDown, DatabaseZap, Globe, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useConfirm, usePrompt, useToast } from './ui/DialogProvider';
import type { Project } from '../types';

export function ProjectSwitcher({projects,currentId,onChange,onProjectsChange}:{
  projects:Project[];
  currentId:number|null;
  onChange:(id:number)=>void;
  onProjectsChange:(projects:Project[])=>void;
}) {
  const prompt = usePrompt();
  const confirm = useConfirm();
  const showToast = useToast();
  const current = projects.find(p=>p.id===currentId);

  async function createProject(){
    const name = await prompt({title:'Nuevo proyecto',message:'Nombre del proyecto:',placeholder:'Ej. Tienda'});
    if(!name?.trim())return;
    const project = await api.createProject({name:name.trim()});
    onProjectsChange([...projects,project]);
    onChange(project.id);
  }

  async function renameProject(p:Project){
    const name = await prompt({title:'Renombrar proyecto',message:'Nuevo nombre:',defaultValue:p.name});
    if(!name?.trim())return;
    const updated = await api.updateProject(p.id,{name:name.trim()});
    onProjectsChange(projects.map(x=>x.id===p.id?updated:x));
  }

  async function togglePublic(p:Project){
    const updated = await api.updateProject(p.id,{is_public:!p.is_public});
    onProjectsChange(projects.map(x=>x.id===p.id?updated:x));
    showToast(updated.is_public?`"${p.name}" ahora es público — cualquiera con el link puede ver su preview.`:`"${p.name}" ahora es privado.`);
  }

  async function togglePreviewWrites(p:Project){
    if(!p.is_public){showToast('Primero publica el proyecto para activar pruebas con datos.','error');return;}
    const updated=await api.updateProject(p.id,{preview_writes_enabled:!p.preview_writes_enabled});
    onProjectsChange(projects.map(x=>x.id===p.id?updated:x));
    showToast(updated.preview_writes_enabled?'Preview funcional activado: formularios y acciones ya pueden modificar datos.':'Preview protegido en modo solo lectura.');
  }

  async function removeProject(p:Project){
    if(projects.length<=1){ showToast('No puedes eliminar el último proyecto.','error'); return; }
    if(!await confirm({message:`¿Eliminar el proyecto "${p.name}" y todo su contenido (rutas, menús, formularios, vistas, gráficas)? Esta acción es irreversible.`,danger:true,confirmLabel:'Eliminar'}))return;
    await api.deleteProject(p.id);
    const rest = projects.filter(x=>x.id!==p.id);
    onProjectsChange(rest);
    if(p.id===currentId && rest[0])onChange(rest[0].id);
  }

  return <details className="project-switcher">
    <summary><strong>{current?.name??'Proyecto'}</strong><ChevronDown size={13}/></summary>
    <div className="project-switcher-menu">
      {projects.map(p=><div key={p.id} className={`project-switcher-item ${p.id===currentId?'active':''}`}>
        <button className="project-switcher-select" onClick={()=>onChange(p.id)}>
          {p.id===currentId?<Check size={13}/>:<span className="project-switcher-dot"/>}
          <span>{p.name}</span>
        </button>
        <button title={p.is_public?'Público — clic para hacerlo privado':'Privado — clic para hacerlo público'} onClick={()=>void togglePublic(p)}>{p.is_public?<Globe size={13}/>:<Lock size={13}/>}</button>
        <button className={p.preview_writes_enabled?'preview-writes-active':''} title={p.preview_writes_enabled?'Preview funcional activo — clic para proteger datos':'Activar formularios y acciones en el preview'} onClick={()=>void togglePreviewWrites(p)}><DatabaseZap size={13}/></button>
        <button title="Renombrar" onClick={()=>void renameProject(p)}><Pencil size={13}/></button>
        <button title="Eliminar" onClick={()=>void removeProject(p)}><Trash2 size={13}/></button>
      </div>)}
      <button className="project-switcher-add" onClick={()=>void createProject()}><Plus size={14}/>Nuevo proyecto</button>
    </div>
  </details>;
}

import { useEffect, useState, type FormEvent } from 'react';
import { LoaderCircle, Lock, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { api } from '../api/client';
import type { Role, SchemaTable } from '../types';

type Perm = {can_read:boolean;can_create:boolean;can_update:boolean;can_delete:boolean};
const ACTIONS: (keyof Perm)[] = ['can_read','can_create','can_update','can_delete'];
const ACTION_LABELS: Record<keyof Perm,string> = {can_read:'Ver',can_create:'Crear',can_update:'Editar',can_delete:'Borrar'};

export function RolesPermissions({tables}:{tables:SchemaTable[]}) {
  const [roles,setRoles] = useState<Role[]>([]);
  const [selectedId,setSelectedId] = useState<number|null>(null);
  const [matrix,setMatrix] = useState<Record<string,Perm>>({});
  const [newRole,setNewRole] = useState('');
  const [saving,setSaving] = useState(false);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{void (async()=>{
    try{
      const [rs] = await Promise.all([api.roles()]);
      setRoles(rs); const first=rs.find(r=>!r.is_admin)??rs[0]; setSelectedId(first?.id??null);
    }finally{ setLoading(false); }
  })();},[]);

  const selected = roles.find(r=>r.id===selectedId)??null;
  useEffect(()=>{ if(!selected) return;
    const base:Record<string,Perm> = {};
    tables.forEach(t=>base[t.name] = {can_read:false,can_create:false,can_update:false,can_delete:false});
    selected.permissions.forEach(p=>base[p.table_name] = {can_read:p.can_read,can_create:p.can_create,can_update:p.can_update,can_delete:p.can_delete});
    setMatrix(base);
  },[selectedId,tables]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createRole(e:FormEvent){ e.preventDefault(); if(!newRole.trim())return; const r=await api.createRole({name:newRole}); setRoles(v=>[...v,r]); setSelectedId(r.id); setNewRole(''); }
  async function removeRole(id:number){ if(!confirm('¿Eliminar rol y sus permisos?'))return; await api.deleteRole(id); setRoles(v=>v.filter(r=>r.id!==id)); setSelectedId(null); }
  function flip(table:string,key:keyof Perm){ setMatrix(v=>{const cur=v[table]??{can_read:false,can_create:false,can_update:false,can_delete:false}; return {...v,[table]:{...cur,[key]:!cur[key]}};}); }
  async function save(){ if(!selected)return; setSaving(true); try{
    await api.savePermissions(selected.id, Object.entries(matrix).map(([table_name,p])=>({table_name,...p})));
    setRoles(await api.roles());
  }finally{ setSaving(false); } }

  if(loading) return <div className="center-state small"><LoaderCircle className="spin"/><p>Cargando roles…</p></div>;

  return <section className="panel">
      <div className="panel-head">
        <div><span className="kicker"><ShieldCheck size={13}/>Accesos</span><h2>Roles y permisos</h2></div>
        <form className="inline-form" onSubmit={createRole}><input value={newRole} onChange={e=>setNewRole(e.target.value)} placeholder="Nuevo rol…"/><button className="button primary" disabled={!newRole.trim()}><Plus size={16}/>Crear</button></form>
      </div>
      <div className="menu-cols">
        <div className="role-list">
          {roles.map(r=><div key={r.id} className={`role-card ${selectedId===r.id?'active':''}`} onClick={()=>setSelectedId(r.id)}>
            <span className="role-dot big" style={{background:r.color}}/>
            <div><strong>{r.name}</strong><small>{r.is_admin?'Acceso total':`${r.permissions.length} permisos`}</small></div>
            {!r.is_admin&&<button className="row-delete" onClick={e=>{e.stopPropagation();void removeRole(r.id);}} aria-label="Eliminar"><Trash2 size={14}/></button>}
          </div>)}
          {!roles.length&&<p className="empty-cell">Crea el primer rol.</p>}
        </div>
        <div className="perm-panel">
          {selected?.is_admin?<div className="callout admin-note"><Lock size={18}/><div><strong>Acceso total</strong><p>Este rol puede ver, crear, editar y borrar en todas las tablas, incluidas las futuras.</p></div></div>:
          selected?<><table className="perm-table">
            <thead><tr><th>Tabla</th>{ACTIONS.map(a=><th key={a}>{ACTION_LABELS[a]}</th>)}</tr></thead>
            <tbody>{tables.map(t=><tr key={t.name}>
              <td><Users size={14}/> {t.app_label||t.name.replace(/^nx_/,'')} <code>{t.name}</code></td>
              {ACTIONS.map(a=><td key={a}><input type="checkbox" checked={matrix[t.name]?.[a]??false} onChange={()=>flip(t.name,a)}/></td>)}
            </tr>)}</tbody>
          </table>
          {!tables.length&&<p className="empty-cell">Crea una tabla primero.</p>}
          <div className="perm-actions"><button className="button primary" onClick={()=>void save()} disabled={saving}>{saving?<LoaderCircle className="spin" size={15}/>:null}Guardar permisos</button></div></>:
          <p className="empty-cell">Selecciona un rol para editar su matriz de permisos.</p>}
        </div>
      </div>
    </section>;
}

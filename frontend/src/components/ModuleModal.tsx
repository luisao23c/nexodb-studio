import { useState, type FormEvent } from 'react';
import { Database, LoaderCircle } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../api/client';
import type { Module } from '../types';

export function ModuleModal({onClose,onCreated}:{onClose:()=>void;onCreated:(module:Module)=>void}) {
  const [name,setName]=useState(''); const [description,setDescription]=useState(''); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  async function submit(e:FormEvent){ e.preventDefault(); setLoading(true); setError(''); try{onCreated(await api.createModule({name,description,icon:'database'}));}catch(err){setError((err as Error).message)}finally{setLoading(false)} }
  return <Modal title="Crear módulo" onClose={onClose}>
    <form className="modal-body" onSubmit={submit}>
      <div className="callout"><Database size={20}/><div><strong>Se creará una tabla real</strong><p>El nombre técnico tendrá el prefijo protegido <code>nx_</code>.</p></div></div>
      <label className="control"><span>Nombre del módulo</span><input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Usuarios" required/></label>
      <label className="control"><span>Descripción</span><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="¿Qué información administrará?" rows={3}/></label>
      {error&&<p className="error-box">{error}</p>}
      <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={loading||!name.trim()}>{loading?<LoaderCircle className="spin" size={17}/>:null}Crear módulo</button></div>
    </form>
  </Modal>;
}

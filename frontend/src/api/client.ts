import type { Choice, Field, Module, Page } from '../types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const KEY = import.meta.env.VITE_BUILDER_KEY || '';

async function request<T>(path:string, init:RequestInit = {}):Promise<T> {
  const response = await fetch(`${BASE}${path}`, { ...init, headers:{ 'Content-Type':'application/json', 'Accept':'application/json', 'X-Builder-Key':KEY, ...init.headers } });
  if (!response.ok) {
    const body = await response.json().catch(()=>({}));
    const validation = body.errors ? Object.values(body.errors).flat().join(' ') : '';
    throw new Error(validation || body.message || `Error ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  modules: () => request<Module[]>('/builder/modules'),
  createModule: (data:Partial<Module>) => request<Module>('/builder/modules',{method:'POST',body:JSON.stringify(data)}),
  createField: (moduleId:number,data:Partial<Field>) => request<Field>(`/builder/modules/${moduleId}/fields`,{method:'POST',body:JSON.stringify(data)}),
  updateField: (moduleId:number,fieldId:number,data:Partial<Field>) => request<Field>(`/builder/modules/${moduleId}/fields/${fieldId}`,{method:'PUT',body:JSON.stringify(data)}),
  records: (moduleId:number,search='',page=1) => request<Page<Record<string,unknown>>>(`/builder/modules/${moduleId}/records?search=${encodeURIComponent(search)}&page=${page}`),
  saveRecord: (moduleId:number,data:Record<string,unknown>,id?:number) => request(`/builder/modules/${moduleId}/records${id?`/${id}`:''}`,{method:id?'PUT':'POST',body:JSON.stringify(data)}),
  deleteRecord: (moduleId:number,id:number) => request<void>(`/builder/modules/${moduleId}/records/${id}`,{method:'DELETE'}),
  options: (moduleId:number) => request<Choice[]>(`/builder/modules/${moduleId}/options`),
};

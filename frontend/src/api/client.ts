import type { AuditEntry, BrowsePage, Chart, ChartData, CodePage, DashboardData, DbOverviewTable, Field, Menu, MenuItem, Module, Page, Role, Choice, SchemaRelationModule, SchemaTable, SchemaTableDetail, SqlResult } from '../types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const KEY = import.meta.env.VITE_BUILDER_KEY || '';

async function request<T>(path:string, init:RequestInit = {}):Promise<T> {
  const response = await fetch(`${BASE}${path}`, { ...init, headers:{ 'Content-Type':'application/json', 'Accept':'application/json', 'X-Builder-Key':KEY, ...init.headers } });
  if (!response.ok) {
    const body = await response.json().catch(()=>({} as {message?:string;errors?:Record<string,string[]>}));
    const validation = body.errors ? Object.values(body.errors).flat().join(' ') : '';
    throw new Error(validation || body.message || `Error ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

const json = (data:unknown) => ({ body:JSON.stringify(data) });

export const api = {
  // Modules & fields
  modules: () => request<Module[]>('/builder/modules'),
  createModule: (data:Partial<Module>) => request<Module>('/builder/modules',{method:'POST',...json(data)}),
  createField: (moduleId:number,data:Partial<Field>) => request<Field>(`/builder/modules/${moduleId}/fields`,{method:'POST',...json(data)}),
  updateField: (moduleId:number,fieldId:number,data:Partial<Field>) => request<Field>(`/builder/modules/${moduleId}/fields/${fieldId}`,{method:'PUT',...json(data)}),
  records: (moduleId:number,search='',page=1) => request<Page<Record<string,unknown>>>(`/builder/modules/${moduleId}/records?search=${encodeURIComponent(search)}&page=${page}`),
  saveRecord: (moduleId:number,data:Record<string,unknown>,id?:number) => request(`/builder/modules/${moduleId}/records${id?`/${id}`:''}`,{method:id?'PUT':'POST',...json(data)}),
  deleteRecord: (moduleId:number,id:number) => request<void>(`/builder/modules/${moduleId}/records/${id}`,{method:'DELETE'}),
  options: (moduleId:number) => request<Choice[]>(`/builder/modules/${moduleId}/options`),

  // Schema explorer
  schemaTables: () => request<{tables:SchemaTable[]}>('/builder/schema/tables'),
  schemaTable: (table:string) => request<SchemaTableDetail>(`/builder/schema/tables/${table}`),
  schemaRelations: () => request<{modules:SchemaRelationModule[]}>('/builder/schema/relations'),
  dbOverview: () => request<{database:string;tables:DbOverviewTable[]}>('/builder/db/overview'),
  dashboard: () => request<DashboardData>('/builder/db/dashboard'),
  audit: (action='',target='') => request<AuditEntry[]>(`/builder/db/audit?action=${encodeURIComponent(action)}&target=${encodeURIComponent(target)}`),
  exportTable: (table:string,format:'csv'|'json'|'sql') => {
    const url = `${BASE}/builder/db/${table}/export?format=${format}`;
    return fetch(url,{headers:{'X-Builder-Key':KEY}}).then(r=>{ if(!r.ok) throw new Error(`Error ${r.status}`); return r.blob(); }).then(b=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`${table}.${format}`; a.click(); URL.revokeObjectURL(a.href); });
  },
  importCsv: (table:string,file:File) => { const fd=new FormData(); fd.append('file',file); return request<{inserted:number;errors:string[];total_lines:number}>(`/builder/db/${table}/import`,{method:'POST',body:fd}); },
  browse: (table:string,page=1,search='') => request<BrowsePage>(`/builder/db/${table}/browse?page=${page}&search=${encodeURIComponent(search)}`),
  deleteRow: (table:string,id:number) => request<void>(`/builder/db/${table}/rows/${id}`,{method:'DELETE'}),
  runSql: (sql:string) => request<SqlResult>('/builder/db/query',{method:'POST',...json({sql})}),
  createDbTable: (data:{name:string;columns?:{name:string;data_type:string;length?:number|null;nullable?:boolean}[]}) => request<{ok:boolean;table:string}>('/builder/db/tables',{method:'POST',...json(data)}),
  addDbColumn: (table:string,data:{name:string;data_type:string;length?:number|null;nullable?:boolean;default_value?:string|null;unique?:boolean}) => request<{ok:boolean}>(`/builder/db/${table}/columns`,{method:'POST',...json(data)}),
  modifyDbColumn: (table:string,column:string,data:{data_type:string;length?:number|null;nullable?:boolean;default_value?:string|null;unique?:boolean}) => request<{ok:boolean}>(`/builder/db/${table}/columns/${column}`,{method:'PUT',...json(data)}),
  dropDbColumn: (table:string,column:string) => request<void>(`/builder/db/${table}/columns/${column}`,{method:'DELETE'}),
  addDbIndex: (table:string,data:{columns:string[];unique?:boolean;name?:string}) => request<{ok:boolean;name:string}>(`/builder/db/${table}/indexes`,{method:'POST',...json(data)}),
  dropDbIndex: (table:string,index:string) => request<void>(`/builder/db/${table}/indexes/${index}`,{method:'DELETE'}),
  renameDbTable: (table:string,name:string) => request<{ok:boolean;table:string}>(`/builder/db/${table}/rename`,{method:'PUT',...json({name})}),
  restoreTableName: (table:string) => request<{ok:boolean}>(`/builder/db/${table}/restore-name`,{method:'PUT'}),
  truncateDbTable: (table:string) => request<void>(`/builder/db/${table}/truncate`,{method:'POST'}),
  dropDbTable: (table:string) => request<void>(`/builder/db/${table}`,{method:'DELETE'}),

  // Foreign keys
  foreignKeys: (table:string) => request<{constraints_name:string;column_name:string;referenced_table_name:string;referenced_column_name:string;delete_rule:string}[]>(`/builder/db/${table}/foreign-keys`),
  addForeignKey: (table:string,data:{column:string;referenced_table:string;referenced_column?:string;on_delete?:string}) => request<{ok:boolean}>(`/builder/db/${table}/foreign-keys`,{method:'POST',...json(data)}),
  dropForeignKey: (table:string,column:string) => request<{ok:boolean}>(`/builder/db/${table}/foreign-keys/${column}`,{method:'DELETE'}),

  // Menus
  menus: () => request<Menu[]>('/builder/menus'),
  createMenu: (data:{name:string;icon?:string}) => request<Menu>('/builder/menus',{method:'POST',...json(data)}),
  deleteMenu: (id:number) => request<void>(`/builder/menus/${id}`,{method:'DELETE'}),
  createMenuItem: (menuId:number,data:Partial<MenuItem>&{role_ids?:number[]}) => request<MenuItem>(`/builder/menus/${menuId}/items`,{method:'POST',...json(data)}),
  updateMenuItem: (menuId:number,itemId:number,data:Partial<MenuItem>&{role_ids?:number[]}) => request<MenuItem>(`/builder/menus/${menuId}/items/${itemId}`,{method:'PUT',...json(data)}),
  deleteMenuItem: (menuId:number,itemId:number) => request<void>(`/builder/menus/${menuId}/items/${itemId}`,{method:'DELETE'}),
  reorderMenuItems: (menuId:number,ids:number[]) => request<{ok:boolean}>(`/builder/menus/${menuId}/reorder`,{method:'POST',...json({ids})}),

  // Roles
  roles: () => request<Role[]>('/builder/roles'),
  createRole: (data:{name:string;description?:string;color?:string;is_admin?:boolean}) => request<Role>('/builder/roles',{method:'POST',...json(data)}),
  updateRole: (id:number,data:Partial<Role>) => request<Role>(`/builder/roles/${id}`,{method:'PUT',...json(data)}),
  deleteRole: (id:number) => request<void>(`/builder/roles/${id}`,{method:'DELETE'}),
  savePermissions: (roleId:number,permissions:{module_id:number;can_read:boolean;can_create:boolean;can_update:boolean;can_delete:boolean}[]) => request<Role>(`/builder/roles/${roleId}/permissions`,{method:'PUT',...json({permissions})}),

  // Charts
  charts: () => request<Chart[]>('/builder/charts'),
  createChart: (data:Partial<Chart>) => request<Chart>('/builder/charts',{method:'POST',...json(data)}),
  updateChart: (id:number,data:Partial<Chart>) => request<Chart>(`/builder/charts/${id}`,{method:'PUT',...json(data)}),
  deleteChart: (id:number) => request<void>(`/builder/charts/${id}`,{method:'DELETE'}),
  chartData: (id:number) => request<ChartData>(`/builder/charts/${id}/data`),

  // Custom pages
  pages: () => request<CodePage[]>('/builder/pages'),
  page: (id:number) => request<CodePage>(`/builder/pages/${id}`),
  createPage: (data:Partial<CodePage>) => request<CodePage>('/builder/pages',{method:'POST',...json(data)}),
  updatePage: (id:number,data:Partial<CodePage>) => request<CodePage>(`/builder/pages/${id}`,{method:'PUT',...json(data)}),
  deletePage: (id:number) => request<void>(`/builder/pages/${id}`,{method:'DELETE'}),
};

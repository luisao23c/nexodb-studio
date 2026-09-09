export type DataType = 'string'|'text'|'integer'|'decimal'|'boolean'|'date'|'datetime'|'relation';
export type InputType = 'text'|'textarea'|'number'|'email'|'date'|'datetime-local'|'checkbox'|'select'|'autocomplete'|'multiselect';
export type FieldFormat = 'none'|'currency'|'number'|'percent'|'date'|'datetime'|'time'|'uppercase'|'lowercase'|'capitalize'|'badge'|'email'|'phone'|'link'|'image'|'color'|'stars'|'progress'|'truncate'|'json'|'relative_time';

export const FORMAT_LABELS: Record<FieldFormat,string> = {
  none:'Sin formato', currency:'Moneda', number:'Número', percent:'Porcentaje', date:'Fecha', datetime:'Fecha y hora',
  time:'Hora', uppercase:'MAYÚSCULAS', lowercase:'minúsculas', capitalize:'Capitalizado', badge:'Etiqueta (badge)',
  email:'Email', phone:'Teléfono', link:'Enlace', image:'Imagen', color:'Color', stars:'Estrellas', progress:'Barra de progreso',
  truncate:'Texto truncado', json:'JSON', relative_time:'Tiempo relativo',
};

export interface Field {
  id:number; module_id:number; name:string; label:string; data_type:DataType; input_type:InputType;
  length?:number|null; nullable:boolean; unique:boolean; default_value?:string|null; required:boolean;
  show_in_table:boolean; show_in_form:boolean; searchable:boolean; sort_order:number;
  related_module_id?:number|null; display_column?:string|null; options?:string[]|null;
  format:FieldFormat; format_config?:{prefix?:string;suffix?:string;decimals?:number;colors?:Record<string,string>}|null;
  related_module?:Pick<Module,'id'|'name'|'table_name'>|null;
}
export interface Module { id:number; name:string; slug:string; table_name:string; description?:string; icon:string; active:boolean; fields:Field[]; }
export interface Page<T> { data:T[]; current_page:number; last_page:number; per_page:number; total:number; }
export interface Choice { id:number; label:string; }

export interface SchemaTable { name:string; managed:boolean; app_label?:string|null; }
export interface SchemaColumn { name:string; type:string; collation?:string|null; nullable:boolean; key?:string|null; default?:string|null; extra?:string|null; comment?:string|null; }
export interface SchemaIndex { name:string; unique:boolean; columns:string[]; }
export interface SchemaTableDetail { table:string; managed_by?:string|null; rows:number; columns:SchemaColumn[]; indexes:SchemaIndex[]; }
export interface SchemaRelationModule { table:string; name:string; relations:{column:string;target_table?:string;target_module?:string}[]; }
export interface DbOverviewTable { name:string; engine:string; rows:number|null; size_kb:string; collation:string; }
export interface BrowsePage { data:Record<string,unknown>[]; total:number; current_page:number; last_page:number; per_page:number; }
export interface SqlResult { columns:string[]; rows:Record<string,unknown>[]; count:number; elapsed_ms:number; }
export interface AuditEntry { id:number; actor:string; action:string; target_type?:string|null; target?:string|null; sql_statement?:string|null; meta?:Record<string,unknown>|null; ip?:string|null; created_at:string; }
export interface DashboardData { database:string; tables:DbOverviewTable[]; total_tables:number; total_rows:number; total_size_kb:number; recent:{action:string;target?:string|null;created_at:string}[]; activity:{d:string;c:number}[]; }

export interface Menu { id:number; name:string; slug:string; icon:string; sort_order:number; active:boolean; items:MenuItem[]; }
export interface MenuItem { id:number; menu_id:number; parent_id?:number|null; label:string; icon:string; target_type:'module'|'page'|'chart_dashboard'|'url'; target_id?:number|null; url?:string|null; badge?:string|null; sort_order:number; active:boolean; required_role_ids?:number[]|null; }

export interface Role { id:number; name:string; slug:string; description?:string|null; color:string; is_admin:boolean; permissions:Permission[]; }
export interface Permission { id:number; role_id:number; module_id:number; can_read:boolean; can_create:boolean; can_update:boolean; can_delete:boolean; }

export interface Chart { id:number; name:string; module_id:number; chart_type:'bar'|'line'|'area'|'pie'|'donut'; label_field:string; value_field?:string|null; aggregate:'count'|'sum'|'avg'|'min'|'max'; sort_direction:'asc'|'desc'; limit:number; color:string; active:boolean; module?:Pick<Module,'id'|'name'|'table_name'>|null; }
export interface ChartData { chart:{id:number;name:string;chart_type:string;color:string}; data:{label:string;value:number}[]; }

export interface CodePage { id:number; name:string; slug:string; description?:string|null; code:string; active:boolean; }

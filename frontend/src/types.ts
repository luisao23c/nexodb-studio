export interface SchemaTable { name:string; managed:boolean; app_label?:string|null; }
export interface SchemaColumn { name:string; type:string; collation?:string|null; nullable:boolean; key?:string|null; default?:string|null; extra?:string|null; comment?:string|null; }
export interface SchemaIndex { name:string; unique:boolean; columns:string[]; }
export interface DbForeignKey { constraint_name:string; column_name:string; referenced_table_name:string; referenced_column_name:string; delete_rule:string; }
export interface RelationOption { id:string|number; label:string; }
export interface SchemaTableDetail { table:string; managed_by?:string|null; rows:number; columns:SchemaColumn[]; indexes:SchemaIndex[]; foreign_keys:DbForeignKey[]; }
export interface SchemaRelationModule { table:string; name:string; relations:{column:string;target_table?:string;target_module?:string}[]; }
export interface DbOverviewTable { name:string; engine:string; rows:number|null; size_kb:string; collation:string; }
export interface BrowsePage { data:Record<string,unknown>[]; total:number; current_page:number; last_page:number; per_page:number; }
export interface SqlResult { columns:string[]; rows:Record<string,unknown>[]; count:number; elapsed_ms:number; }
export interface AuditEntry { id:number; actor:string; action:string; target_type?:string|null; target?:string|null; sql_statement?:string|null; meta?:Record<string,unknown>|null; ip?:string|null; created_at:string; }
export interface DashboardData { database:string; tables:DbOverviewTable[]; total_tables:number; total_rows:number; total_size_kb:number; recent:{action:string;target?:string|null;created_at:string}[]; activity:{d:string;c:number}[]; }

export interface Project { id:number; name:string; slug:string; icon?:string|null; is_public:boolean; preview_writes_enabled:boolean; active:boolean; created_at?:string; }
export interface ProjectVersion { id:number; project_id:number; version:string; major:number; minor:number; patch:number; label?:string|null; notes?:string|null; change_summary?:Record<string,{label:string;total:number;delta:number}>|null; snapshot_hash:string; is_published:boolean; restored_at?:string|null; created_at:string; snapshot?:Record<string,unknown>; }

export interface Menu { id:number; project_id:number; name:string; slug:string; icon:string; sort_order:number; active:boolean; items:MenuItem[]; }
export interface MenuItem { id:number; menu_id:number; parent_id?:number|null; label:string; icon:string; target_type:'table'|'page'|'chart_dashboard'|'url'; target_id?:number|null; target_table?:string|null; url?:string|null; badge?:string|null; sort_order:number; active:boolean; required_role_ids?:number[]|null; }

export interface Role { id:number; name:string; slug:string; description?:string|null; color:string; is_admin:boolean; permissions:Permission[]; }
export interface Permission { id:number; role_id:number; table_name:string; can_read:boolean; can_create:boolean; can_update:boolean; can_delete:boolean; }

export interface Chart { id:number; project_id:number; name:string; table_name:string; chart_type:'bar'|'line'|'area'|'pie'|'donut'; label_field:string; value_field?:string|null; aggregate:'count'|'sum'|'avg'|'min'|'max'; sort_direction:'asc'|'desc'; limit:number; color:string; active:boolean; }
export interface ChartData { chart:{id:number;name:string;chart_type:string;color:string}; data:{label:string;value:number}[]; }

export interface CodePage { id:number; project_id:number; name:string; slug:string; description?:string|null; code:string; active:boolean; }

export interface BuilderRoute { id:number; project_id:number; parent_id:number|null; name:string; slug:string; icon?:string|null; sort_order:number;
  content_type:'table'|'form'|'chart'|'page'|'redirect'|'divider'|'empty'; content_config?:Record<string,unknown>|null;
  layout:'default'|'sidebar'|'tabs'|'fullwidth'|'card'; active:boolean; visible_in_menu:boolean;
  badge_color?:string|null; badge_label?:string|null; children?:BuilderRoute[]; }

export type FormFieldType = 'text'|'textarea'|'number'|'email'|'password'|'date'|'datetime'|'autocomplete'|'select'|'multiselect'|'checkbox'|'radio'|'switch'|'file'|'hidden'|'heading'|'divider'|'button';
export interface BuilderFormField { id?:number; field_key:string; label:string; field_type:FormFieldType; source_column?:string|null; placeholder?:string|null; help_text?:string|null; default_value?:string|null; width:number; required:boolean; options?:string[]|null; config?:Record<string,unknown>|null; sort_order?:number; }
export interface BuilderForm { id?:number; project_id?:number; name:string; form_key:string; table_name:string; description?:string|null; layout_columns:number; submit_label:string; settings?:Record<string,unknown>|null; active:boolean; fields:BuilderFormField[]; }

export type ViewDisplayType = 'text'|'number'|'money'|'date'|'datetime'|'badge'|'boolean'|'image'|'link'|'email'|'json';
export interface BuilderViewColumn { id?:number; column_key:string; label:string; display_type:ViewDisplayType; width?:number|null; sortable:boolean; searchable:boolean; visible:boolean; config?:Record<string,unknown>|null; sort_order?:number; }
export interface BuilderView { id?:number; project_id?:number; name:string; view_key:string; table_name:string; description?:string|null; primary_key:string; default_sort_column?:string|null; default_sort_direction:'asc'|'desc'; per_page:number; settings?:Record<string,unknown>|null; active:boolean; columns:BuilderViewColumn[]; }

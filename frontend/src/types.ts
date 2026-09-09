export interface SchemaTable { name:string; managed:boolean; app_label?:string|null; }
export interface SchemaColumn { name:string; type:string; collation?:string|null; nullable:boolean; key?:string|null; default?:string|null; extra?:string|null; comment?:string|null; }
export interface SchemaIndex { name:string; unique:boolean; columns:string[]; }
export interface DbForeignKey { constraint_name:string; column_name:string; referenced_table_name:string; referenced_column_name:string; delete_rule:string; }
export interface RelationOption { id:string|number; label:string; }
export interface SchemaTableDetail { table:string; managed_by?:string|null; rows:number; columns:SchemaColumn[]; indexes:SchemaIndex[]; }
export interface SchemaRelationModule { table:string; name:string; relations:{column:string;target_table?:string;target_module?:string}[]; }
export interface DbOverviewTable { name:string; engine:string; rows:number|null; size_kb:string; collation:string; }
export interface BrowsePage { data:Record<string,unknown>[]; total:number; current_page:number; last_page:number; per_page:number; }
export interface SqlResult { columns:string[]; rows:Record<string,unknown>[]; count:number; elapsed_ms:number; }
export interface AuditEntry { id:number; actor:string; action:string; target_type?:string|null; target?:string|null; sql_statement?:string|null; meta?:Record<string,unknown>|null; ip?:string|null; created_at:string; }
export interface DashboardData { database:string; tables:DbOverviewTable[]; total_tables:number; total_rows:number; total_size_kb:number; recent:{action:string;target?:string|null;created_at:string}[]; activity:{d:string;c:number}[]; }

export interface Menu { id:number; name:string; slug:string; icon:string; sort_order:number; active:boolean; items:MenuItem[]; }
export interface MenuItem { id:number; menu_id:number; parent_id?:number|null; label:string; icon:string; target_type:'table'|'page'|'chart_dashboard'|'url'; target_id?:number|null; target_table?:string|null; url?:string|null; badge?:string|null; sort_order:number; active:boolean; required_role_ids?:number[]|null; }

export interface Role { id:number; name:string; slug:string; description?:string|null; color:string; is_admin:boolean; permissions:Permission[]; }
export interface Permission { id:number; role_id:number; table_name:string; can_read:boolean; can_create:boolean; can_update:boolean; can_delete:boolean; }

export interface Chart { id:number; name:string; table_name:string; chart_type:'bar'|'line'|'area'|'pie'|'donut'; label_field:string; value_field?:string|null; aggregate:'count'|'sum'|'avg'|'min'|'max'; sort_direction:'asc'|'desc'; limit:number; color:string; active:boolean; }
export interface ChartData { chart:{id:number;name:string;chart_type:string;color:string}; data:{label:string;value:number}[]; }

export interface CodePage { id:number; name:string; slug:string; description?:string|null; code:string; active:boolean; }

export type DataType = 'string'|'text'|'integer'|'decimal'|'boolean'|'date'|'datetime'|'relation';
export type InputType = 'text'|'textarea'|'number'|'email'|'date'|'datetime-local'|'checkbox'|'select'|'autocomplete'|'multiselect';

export interface Field {
  id:number; module_id:number; name:string; label:string; data_type:DataType; input_type:InputType;
  length?:number|null; nullable:boolean; unique:boolean; default_value?:string|null; required:boolean;
  show_in_table:boolean; show_in_form:boolean; searchable:boolean; sort_order:number;
  related_module_id?:number|null; display_column?:string|null; options?:string[]|null; related_module?:Pick<Module,'id'|'name'|'table_name'>|null;
}
export interface Module { id:number; name:string; slug:string; table_name:string; description?:string; icon:string; active:boolean; fields:Field[]; }
export interface Page<T> { data:T[]; current_page:number; last_page:number; per_page:number; total:number; }
export interface Choice { id:number; label:string; }

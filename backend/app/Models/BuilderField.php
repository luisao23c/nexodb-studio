<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuilderField extends Model
{
    protected $fillable = ['module_id','name','label','data_type','input_type','length','nullable','unique','default_value','required','show_in_table','show_in_form','searchable','sort_order','related_module_id','display_column','options','validation_rules'];
    protected $casts = ['nullable'=>'boolean','unique'=>'boolean','required'=>'boolean','show_in_table'=>'boolean','show_in_form'=>'boolean','searchable'=>'boolean','options'=>'array','validation_rules'=>'array'];
    public function module(): BelongsTo { return $this->belongsTo(BuilderModule::class, 'module_id'); }
    public function relatedModule(): BelongsTo { return $this->belongsTo(BuilderModule::class, 'related_module_id'); }
}

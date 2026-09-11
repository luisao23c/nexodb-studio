<?php

namespace App\Services\Export;

use App\Models\BuilderChart;
use App\Models\BuilderForm;
use App\Models\BuilderView;
use Illuminate\Support\Collection;

/** The set of tables/forms/views/charts a project actually references, as computed by ProjectReferenceAnalyzer. */
class ExportReferenceSet
{
    /**
     * @param  string[]  $tableNames
     * @param  Collection<int, BuilderForm>  $forms
     * @param  Collection<int, BuilderView>  $views
     * @param  Collection<int, BuilderChart>  $charts
     */
    public function __construct(
        public readonly array $tableNames,
        public readonly Collection $forms,
        public readonly Collection $views,
        public readonly Collection $charts,
    ) {}
}

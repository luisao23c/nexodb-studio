<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\Export\ControllerGenerator;
use App\Services\Export\FrontendPageGenerator;
use App\Services\Export\FrontendScaffoldGenerator;
use App\Services\Export\LaravelScaffoldGenerator;
use App\Services\Export\MigrationGenerator;
use App\Services\Export\ModelGenerator;
use App\Services\Export\ProjectReferenceAnalyzer;
use App\Services\Export\RoutesGenerator;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class ProjectExportController extends Controller
{
    public function __construct(
        private ProjectReferenceAnalyzer $analyzer,
        private MigrationGenerator $migrations,
        private ModelGenerator $models,
        private ControllerGenerator $controllers,
        private RoutesGenerator $routes,
        private LaravelScaffoldGenerator $scaffold,
        private FrontendScaffoldGenerator $frontendScaffold,
    ) {}

    public function export(Project $project): BinaryFileResponse
    {
        $set = $this->analyzer->analyze($project);
        $flatRoutes = $project->routes()->get();

        $backendFiles = [];
        $backendFiles += $this->scaffold->generate($project->name, $project->slug);
        $backendFiles += $this->migrations->generate($set->tableNames);
        $backendFiles += $this->models->generate($set->tableNames);
        $backendFiles += $this->controllers->generate($set->tableNames, $set->forms);
        $backendFiles['routes/api.php'] = $this->routes->generate($set->tableNames);

        $pageGenerator = new FrontendPageGenerator(
            $set->forms->keyBy('id'),
            $set->views->keyBy('id'),
            $set->charts->keyBy('id'),
        );

        $frontendFiles = [];
        $frontendFiles += $this->frontendScaffold->generate($project->name);
        $frontendFiles += $pageGenerator->generate($project->name, $flatRoutes);

        $zipPath = tempnam(sys_get_temp_dir(), 'export').'.zip';
        $zip = new ZipArchive;
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        foreach ($backendFiles as $path => $contents) {
            $zip->addFromString("backend/{$path}", $contents);
        }
        foreach ($frontendFiles as $path => $contents) {
            $zip->addFromString($path, $contents);
        }
        $zip->close();

        $filename = $project->slug.'-export.zip';

        return response()->download($zipPath, $filename)->deleteFileAfterSend(true);
    }
}

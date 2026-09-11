<?php

namespace App\Services\Export;

use App\Models\BuilderChart;
use App\Models\BuilderForm;
use App\Models\BuilderRoute;
use App\Models\BuilderView;
use Illuminate\Support\Collection;

/**
 * Generates one real page component per route, a real router, and a real sidebar — following exactly the
 * content precedence rule of ProjectBuilder.tsx's renderContent(): content_config.components wins when
 * non-empty, otherwise the content_type shortcut is used. Static generation: every route/path is baked
 * into real, editable .tsx files, not resolved dynamically at runtime.
 */
class FrontendPageGenerator
{
    private RouteTreeHelper $routeTree;

    /**
     * @param  Collection<int, BuilderForm>  $forms
     * @param  Collection<int, BuilderView>  $views
     * @param  Collection<int, BuilderChart>  $charts
     */
    public function __construct(
        private Collection $forms,
        private Collection $views,
        private Collection $charts,
    ) {
        $this->routeTree = new RouteTreeHelper;
    }

    /**
     * @param  Collection<int, BuilderRoute>  $flatRoutes  every route of the project, flat
     * @return array<string, string> filename => contents
     */
    public function generate(string $projectName, Collection $flatRoutes): array
    {
        $files = [];
        $paths = $this->routeTree->buildPaths($flatRoutes);
        $tree = $this->routeTree->nest($flatRoutes);
        $componentGen = new ComponentCodeGenerator($this->forms, $this->views, $this->charts);

        $pageNames = [];
        foreach ($flatRoutes as $route) {
            $pageNames[$route->id] = 'Page'.$route->id;
        }

        foreach ($flatRoutes as $route) {
            $files["frontend/src/pages/{$pageNames[$route->id]}.tsx"] = $this->renderPage($route, $pageNames[$route->id], $componentGen);
        }

        $firstVisible = $this->routeTree->findFirstVisible($tree);
        $files['frontend/src/router.tsx'] = $this->renderRouter($flatRoutes, $paths, $pageNames, $firstVisible);
        $files['frontend/src/components/Sidebar.tsx'] = $this->renderSidebar($tree, $paths);
        $files['frontend/src/App.tsx'] = $this->renderApp($projectName);

        return $files;
    }

    private function renderPage(BuilderRoute $route, string $componentName, ComponentCodeGenerator $componentGen): string
    {
        $components = is_array($route->content_config['components'] ?? null) ? $route->content_config['components'] : [];

        if (count($components) > 0) {
            $body = $componentGen->renderTree($components);
        } else {
            $body = match ($route->content_type) {
                'table' => $componentGen->renderTree([[
                    'type' => 'table', 'label' => $route->name,
                    'config' => ['view_id' => $route->content_config['view_id'] ?? null, 'show_title' => false],
                ]]),
                'form' => $componentGen->renderTree([[
                    'type' => 'form', 'label' => $route->name,
                    'config' => ['form_id' => $route->content_config['form_id'] ?? null, 'show_title' => false],
                ]]),
                'chart' => $componentGen->renderTree([[
                    'type' => 'chart', 'label' => $route->name,
                    'config' => ['chart_id' => $route->content_config['chart_id'] ?? null, 'show_title' => false],
                ]]),
                'page' => '<div className="panel"><p>Página personalizada.</p></div>',
                'redirect' => '<Navigate to='.$this->js((string) ($route->content_config['target_url'] ?? '/')).' replace />',
                'divider' => '<hr />',
                default => '<div className="panel"><p>Página vacía.</p></div>',
            };
        }

        $extra = $componentGen->flushExtraComponents();
        $extraBlock = $extra !== '' ? "\n\n{$extra}\n" : '';
        $routeNameJs = '{'.$this->js($route->name).'}';

        return <<<TSX
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { GeneratedForm } from '../components/generated/GeneratedForm';
import { GeneratedTable } from '../components/generated/GeneratedTable';
import { GeneratedChart } from '../components/generated/GeneratedChart';
import { GeneratedList } from '../components/generated/GeneratedList';
import { GeneratedDetail } from '../components/generated/GeneratedDetail';
{$extraBlock}
export default function {$componentName}() {
  return (
    <div className="page">
      <h2>{$routeNameJs}</h2>
      {$body}
    </div>
  );
}

TSX;
    }

    /**
     * @param  Collection<int, BuilderRoute>  $flatRoutes
     * @param  array<int, string>  $paths
     * @param  array<int, string>  $pageNames
     */
    private function renderRouter(Collection $flatRoutes, array $paths, array $pageNames, ?BuilderRoute $firstVisible): string
    {
        $imports = [];
        $routeElements = [];
        foreach ($flatRoutes as $route) {
            $name = $pageNames[$route->id];
            $imports[] = "import {$name} from './pages/{$name}';";
            $path = ltrim($paths[$route->id], '/');
            $routeElements[] = '        <Route path='.$this->js($path)." element={<{$name} />} />";
        }
        $importsBlock = implode("\n", $imports);
        $routesBlock = implode("\n", $routeElements);
        $defaultPath = $firstVisible ? ltrim($paths[$firstVisible->id] ?? '', '/') : '';

        return <<<TSX
import { Routes, Route, Navigate } from 'react-router-dom';
{$importsBlock}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={{$this->js('/'.$defaultPath)}} replace />} />
{$routesBlock}
    </Routes>
  );
}

TSX;
    }

    /**
     * @param  Collection<int, BuilderRoute>  $tree
     * @param  array<int, string>  $paths
     */
    private function renderSidebar(Collection $tree, array $paths): string
    {
        $items = $this->renderNavItems($tree, $paths, 0);

        return <<<TSX
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h1>Aplicación</h1>
      <nav>
{$items}
      </nav>
    </aside>
  );
}

TSX;
    }

    /**
     * @param  Collection<int, BuilderRoute>  $routes
     * @param  array<int, string>  $paths
     */
    private function renderNavItems(Collection $routes, array $paths, int $depth): string
    {
        $lines = [];
        foreach ($routes as $route) {
            if (! $route->active || ! $route->visible_in_menu) {
                continue;
            }
            $indent = str_repeat('  ', $depth);
            $path = $this->js($paths[$route->id] ?? '/');
            $style = $depth > 0 ? ' style={{ paddingLeft: '.($depth * 16).' }}' : '';
            $lines[] = "{$indent}<NavLink to={{$path}}{$style} className={({ isActive }) => isActive ? 'active' : ''}>{".$this->js($route->name).'}</NavLink>';
            $children = collect($route->children ?? []);
            if ($children->isNotEmpty()) {
                $lines[] = $this->renderNavItems($children, $paths, $depth + 1);
            }
        }

        return implode("\n", $lines);
    }

    private function renderApp(string $projectName): string
    {
        return <<<'TSX'
import { HashRouter } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AppRouter from './router';

export default function App() {
  return (
    <HashRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main">
          <AppRouter />
        </main>
      </div>
    </HashRouter>
  );
}

TSX;
    }

    private function js(mixed $value): string
    {
        return json_encode((string) $value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

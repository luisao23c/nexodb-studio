<?php

namespace App\Services\Export;

use App\Models\BuilderRoute;
use Illuminate\Support\Collection;

/** PHP port of ProjectBuilder.tsx's buildRoutePaths/findFirstVisibleRoute, so generated paths match the Studio's own preview exactly. */
class RouteTreeHelper
{
    /** @param  Collection<int, BuilderRoute>  $flatRoutes
     * @return array<int, string> route id => full path, e.g. "/parent/child" */
    public function buildPaths(Collection $flatRoutes): array
    {
        $byId = $flatRoutes->keyBy('id');
        $paths = [];
        foreach ($flatRoutes as $route) {
            $parts = [$route->slug];
            $parent = $route->parent_id ? $byId->get($route->parent_id) : null;
            $visited = [$route->id => true];
            while ($parent && ! isset($visited[$parent->id])) {
                $visited[$parent->id] = true;
                array_unshift($parts, $parent->slug);
                $parent = $parent->parent_id ? $byId->get($parent->parent_id) : null;
            }
            $paths[$route->id] = '/'.implode('/', $parts);
        }

        return $paths;
    }

    /** @param  Collection<int, BuilderRoute>  $tree  nested (parent_id-grouped) routes */
    public function findFirstVisible(Collection $tree): ?BuilderRoute
    {
        foreach ($tree as $route) {
            if ($route->active && $route->visible_in_menu) {
                return $route;
            }
            $child = $this->findFirstVisible(collect($route->children ?? []));
            if ($child) {
                return $child;
            }
        }

        return null;
    }

    /** @param  Collection<int, BuilderRoute>  $flatRoutes
     * @return Collection<int, BuilderRoute> nested tree with ->children set */
    public function nest(Collection $flatRoutes): Collection
    {
        $byId = $flatRoutes->keyBy('id');
        foreach ($flatRoutes as $route) {
            $route->setRelation('children', collect());
        }
        $roots = collect();
        foreach ($flatRoutes as $route) {
            if ($route->parent_id && $byId->has($route->parent_id)) {
                $byId->get($route->parent_id)->children->push($route);
            } elseif (! $route->parent_id) {
                $roots->push($route);
            }
        }

        return $roots;
    }
}

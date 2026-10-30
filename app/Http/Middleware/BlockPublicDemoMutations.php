<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * En el tenant demo bloquea POST/PUT/PATCH/DELETE del menú Configuración.
 * El resto de módulos (series, caja, etc.) sí se pueden usar.
 */
class BlockPublicDemoMutations
{
    /** @var list<string> */
    private const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public function handle(Request $request, Closure $next): Response
    {
        if (! is_public_demo_tenant()) {
            return $next($request);
        }

        if (! in_array($request->method(), self::MUTATING_METHODS, true)) {
            return $next($request);
        }

        $routeName = (string) ($request->route()?->getName() ?? '');

        if ($this->isAllowedMutation($routeName)) {
            return $next($request);
        }

        if ($this->isConfiguracionMutation($routeName)) {
            abort(403, __('demo.mutations_blocked'));
        }

        return $next($request);
    }

    private function isAllowedMutation(string $routeName): bool
    {
        if ($routeName === '') {
            return false;
        }

        /** @var list<string> $allowed */
        $allowed = config('demo.allowed_mutation_route_names', []);

        return in_array($routeName, $allowed, true);
    }

    private function isConfiguracionMutation(string $routeName): bool
    {
        return str_starts_with($routeName, 'configuracion.');
    }
}

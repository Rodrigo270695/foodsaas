<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloquea POST/PUT/PATCH/DELETE en el tenant público demo (excepto auth y salir).
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

        /** @var User|null $user */
        $user = $request->user();
        if ($user?->isPlatformSuperadmin()) {
            return $next($request);
        }

        if (! in_array($request->method(), self::MUTATING_METHODS, true)) {
            return $next($request);
        }

        $routeName = (string) ($request->route()?->getName() ?? '');

        if ($this->isAllowedMutation($routeName)) {
            return $next($request);
        }

        abort(403, __('demo.mutations_blocked'));
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
}

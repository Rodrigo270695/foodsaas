<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\Tenancy\TenantModuleRegistry;
use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate de módulo: `tenant.module:reportes` aborta si está deshabilitado o el plan no lo incluye.
 */
final class EnsureTenantModuleEnabled
{
    public function handle(Request $request, Closure $next, string $moduleKey): Response
    {
        $tenant = app(TenantManager::class)->current()?->tenant;

        if (! TenantModuleRegistry::isEnabled($tenant, $moduleKey)) {
            if ($request->header('X-Inertia')) {
                return Inertia::render('errors/forbidden', [
                    'message' => 'Este módulo no está disponible para tu plan o fue deshabilitado.',
                ])->toResponse($request)->setStatusCode(403);
            }

            abort(403, 'Este módulo no está disponible para tu plan o fue deshabilitado.');
        }

        return $next($request);
    }
}

<?php

namespace App\Http\Middleware;

use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class MatchUserTenant
{
    public function __construct(protected TenantManager $manager) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('web')->user();

        if ($user === null) {
            return $next($request);
        }

        $hostTenantId = $this->manager->check() ? $this->manager->current()?->id() : null;
        $userTenantId = $user->tenant_id;

        if ($hostTenantId === $userTenantId) {
            return $next($request);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        abort(403, $this->buildMessage($hostTenantId, $userTenantId));
    }

    private function buildMessage(?string $hostTenantId, ?string $userTenantId): string
    {
        if ($hostTenantId === null && $userTenantId !== null) {
            return 'Tu cuenta pertenece a un restaurante. Inicia sesión desde el subdominio de tu local.';
        }
        if ($hostTenantId !== null && $userTenantId === null) {
            return 'Este es el panel de un restaurante. Tu cuenta es del panel central de FoodSaaS.';
        }

        return 'Tu cuenta no tiene acceso a este restaurante.';
    }
}

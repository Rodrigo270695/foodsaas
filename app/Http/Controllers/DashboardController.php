<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Dashboard\PlatformDashboardMetrics;
use App\Services\Dashboard\TenantDashboardMetrics;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(
        Request $request,
        TenantDashboardMetrics $tenantMetrics,
        PlatformDashboardMetrics $platformMetrics,
    ): Response {
        $user = $request->user();
        $onPlatform = $user instanceof User
            && $user->isPlatformSuperadmin()
            && (tenant_id() === null || tenant_id() === '');

        if ($onPlatform) {
            return Inertia::render('dashboard', [
                'mode' => 'platform',
                // No usar la clave `tenant`: choca con el share de Inertia
                // (contexto del restaurante: id/slug/schema).
                'tenantMetrics' => null,
                'platformMetrics' => $platformMetrics->build(),
            ]);
        }

        try {
            $payload = $tenantMetrics->build();
        } catch (\Throwable) {
            $payload = [
                'sede_id' => null,
                'kpis' => [
                    'ventas_hoy' => 0.0,
                    'ventas_ayer' => 0.0,
                    'delta_pct' => null,
                    'ventas_count' => 0,
                    'ticket_promedio' => 0.0,
                    'pedidos_abiertos' => 0,
                    'cocina_en_cola' => 0,
                    'mesas_ocupadas' => 0,
                    'caja_abierta' => false,
                ],
                'ventas_trend' => [],
                'medios' => [],
                'por_canal' => [],
                'top_productos' => [],
            ];
        }

        return Inertia::render('dashboard', [
            'mode' => 'tenant',
            'tenantMetrics' => $payload,
            'platformMetrics' => null,
        ]);
    }
}

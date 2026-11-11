<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Dashboard\PlatformDashboardMetrics;
use App\Services\Dashboard\TenantDashboardMetrics;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

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
                // Clave propia: no chocar con el share `tenant` (id/slug/schema).
                'panel' => [
                    'mode' => 'platform',
                    'tenant' => null,
                    'platform' => $this->safePlatform($platformMetrics),
                ],
            ]);
        }

        return Inertia::render('dashboard', [
            'panel' => [
                'mode' => 'tenant',
                'tenant' => $this->safeTenant($tenantMetrics),
                'platform' => null,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function safePlatform(PlatformDashboardMetrics $service): array
    {
        try {
            return $service->build();
        } catch (Throwable $e) {
            report($e);

            return [
                'kpis' => [
                    'tenants_total' => 0,
                    'tenants_active' => 0,
                    'tenants_trial' => 0,
                    'tenants_suspended' => 0,
                    'tenants_cancelled' => 0,
                    'mrr' => 0.0,
                    'users_total' => 0,
                    'planes_activos' => 0,
                ],
                'por_estado' => [],
                'por_plan' => [],
                'altas_trend' => [],
                'recientes' => [],
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function safeTenant(TenantDashboardMetrics $service): array
    {
        try {
            return $service->build();
        } catch (Throwable $e) {
            report($e);

            return [
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
    }
}

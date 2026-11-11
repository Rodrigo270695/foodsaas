<?php

declare(strict_types=1);

namespace App\Services\Dashboard;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

final class PlatformDashboardMetrics
{
    private const TREND_DAYS = 30;

    /**
     * @return array{
     *     kpis: array{
     *         tenants_total: int,
     *         tenants_active: int,
     *         tenants_trial: int,
     *         tenants_suspended: int,
     *         tenants_cancelled: int,
     *         mrr: float,
     *         users_total: int,
     *         planes_activos: int
     *     },
     *     por_estado: list<array{estado: string, count: int}>,
     *     por_plan: list<array{plan: string, codigo: string, count: int, color: string|null}>,
     *     altas_trend: list<array{date: string, label: string, count: int}>,
     *     recientes: list<array{
     *         id: string,
     *         slug: string,
     *         nombre: string,
     *         estado: string,
     *         plan: string|null,
     *         created_at: string
     *     }>
     * }
     */
    public function build(): array
    {
        $statsByEstado = Tenant::query()
            ->select('estado', DB::raw('COUNT(*) as total'))
            ->groupBy('estado')
            ->pluck('total', 'estado');

        $activeSubQuery = Subscription::query()
            ->whereIn('estado', ['trial', 'active', 'grace']);

        $mrr = (float) (clone $activeSubQuery)
            ->whereNotNull('precio_pactado')
            ->sum('precio_pactado');

        $porPlan = Subscription::query()
            ->select([
                'planes.nombre as plan',
                'planes.codigo as codigo',
                'planes.color_hex as color',
                DB::raw('COUNT(*) as count'),
            ])
            ->join('planes', 'planes.id', '=', 'subscriptions.plan_id')
            ->whereIn('subscriptions.estado', ['trial', 'active', 'grace'])
            ->groupBy('planes.id', 'planes.nombre', 'planes.codigo', 'planes.color_hex')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'plan' => (string) $row->plan,
                'codigo' => (string) $row->codigo,
                'count' => (int) $row->count,
                'color' => $row->color !== null ? (string) $row->color : null,
            ])
            ->all();

        $porEstado = collect(['trial', 'active', 'suspended', 'cancelled', 'pending'])
            ->map(fn (string $estado) => [
                'estado' => $estado,
                'count' => (int) ($statsByEstado[$estado] ?? 0),
            ])
            ->filter(fn (array $row) => $row['count'] > 0 || in_array($row['estado'], ['trial', 'active', 'suspended'], true))
            ->values()
            ->all();

        return [
            'kpis' => [
                'tenants_total' => (int) Tenant::query()->count(),
                'tenants_active' => (int) ($statsByEstado['active'] ?? 0),
                'tenants_trial' => (int) ($statsByEstado['trial'] ?? 0),
                'tenants_suspended' => (int) ($statsByEstado['suspended'] ?? 0),
                'tenants_cancelled' => (int) ($statsByEstado['cancelled'] ?? 0),
                'mrr' => round($mrr, 2),
                'users_total' => (int) User::query()->whereNotNull('tenant_id')->count(),
                'planes_activos' => (int) Plan::query()->where('activo', true)->count(),
            ],
            'por_estado' => $porEstado,
            'por_plan' => $porPlan,
            'altas_trend' => $this->altasTrend(),
            'recientes' => $this->recientes(),
        ];
    }

    /**
     * @return list<array{date: string, label: string, count: int}>
     */
    private function altasTrend(): array
    {
        $desde = now()->subDays(self::TREND_DAYS - 1)->startOfDay();

        $rows = Tenant::query()
            ->select([
                DB::raw('DATE(created_at) as dia'),
                DB::raw('COUNT(*) as count'),
            ])
            ->where('created_at', '>=', $desde)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('count', 'dia');

        $out = [];
        for ($i = self::TREND_DAYS - 1; $i >= 0; $i--) {
            $day = Carbon::now()->subDays($i);
            $key = $day->toDateString();
            $out[] = [
                'date' => $key,
                'label' => $day->format('d/m'),
                'count' => (int) ($rows[$key] ?? 0),
            ];
        }

        return $out;
    }

    /**
     * @return list<array{id: string, slug: string, nombre: string, estado: string, plan: string|null, created_at: string}>
     */
    private function recientes(): array
    {
        return Tenant::query()
            ->with([
                'subscriptions' => fn ($q) => $q
                    ->whereIn('estado', ['trial', 'active', 'grace', 'suspended'])
                    ->latest()
                    ->limit(1),
                'subscriptions.plan:id,nombre',
            ])
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->map(function (Tenant $tenant) {
                $sub = $tenant->subscriptions->first();

                return [
                    'id' => (string) $tenant->id,
                    'slug' => (string) $tenant->slug,
                    'nombre' => (string) ($tenant->nombre_comercial ?: $tenant->razon_social),
                    'estado' => (string) $tenant->estado,
                    'plan' => $sub?->plan?->nombre,
                    'created_at' => $tenant->created_at?->toIso8601String() ?? '',
                ];
            })
            ->all();
    }
}

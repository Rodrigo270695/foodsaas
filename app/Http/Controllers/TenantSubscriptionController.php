<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Support\Plan\PlanLimits;
use App\Tenancy\TenantManager;
use Carbon\CarbonInterface;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Vista tenant «Mi suscripción»: plan activo + uso de límites.
 */
class TenantSubscriptionController extends Controller
{
    /** @var list<string> */
    private const USAGE_FEATURES = [
        'max_sedes',
        'max_usuarios',
        'max_productos',
        'max_mesas',
        'max_pedidos_mes',
    ];

    public function show(TenantManager $tenants): Response
    {
        $ctx = $tenants->current();
        abort_if($ctx === null, 404);

        $tenant = $ctx->tenant;
        $subscription = $tenant->activeSubscription();
        if ($subscription !== null) {
            $subscription->loadMissing('plan.features');
        }

        $plan = $subscription?->plan ?? PlanLimits::activePlan($tenant);
        if ($plan !== null) {
            $plan->loadMissing('features');
        }

        $snapshot = PlanLimits::snapshot($tenant) ?? [];
        $usage = [];
        foreach (self::USAGE_FEATURES as $feature) {
            if (! isset($snapshot[$feature])) {
                continue;
            }
            $usage[] = [
                'feature' => $feature,
                ...$snapshot[$feature],
            ];
        }

        $modules = [];
        if ($plan !== null) {
            $featureRows = $plan->features->keyBy('feature');
            foreach (Plan::FEATURE_CATALOG as $feature => $meta) {
                if (($meta['type'] ?? null) !== 'bool') {
                    continue;
                }
                $row = $featureRows->get($feature);
                $enabled = $row !== null
                    ? (bool) $row->valor_bool
                    : (bool) ($meta['default'] ?? false);
                $modules[] = [
                    'feature' => $feature,
                    'group' => (string) ($meta['group'] ?? 'modulos'),
                    'enabled' => $enabled,
                ];
            }
        }

        $periodEnd = $subscription?->current_period_end;
        $nextCharge = $subscription?->proximo_cobro_at ?? $periodEnd;
        $daysUntilCharge = $this->daysUntil($nextCharge);

        return Inertia::render('configuracion/suscripcion/index', [
            'plan' => $plan === null ? null : [
                'id' => $plan->id,
                'codigo' => $plan->codigo,
                'nombre' => $plan->nombre,
                'descripcion' => $plan->descripcion,
                'badge' => $plan->badge,
                'color_hex' => $plan->color_hex,
                'precio_mensual' => $plan->precio_mensual !== null
                    ? (float) $plan->precio_mensual
                    : null,
                'precio_anual' => $plan->precio_anual !== null
                    ? (float) $plan->precio_anual
                    : null,
            ],
            'subscription' => $subscription === null ? null : [
                'id' => $subscription->id,
                'estado' => $subscription->estado,
                'ciclo' => $subscription->ciclo,
                'precio_pactado' => (float) $subscription->precio_pactado,
                'descuento_pct' => (float) $subscription->descuento_pct,
                'trial_ends_at' => optional($subscription->trial_ends_at)?->toIso8601String(),
                'current_period_start' => optional($subscription->current_period_start)?->toIso8601String(),
                'current_period_end' => optional($subscription->current_period_end)?->toIso8601String(),
                'grace_ends_at' => optional($subscription->grace_ends_at)?->toIso8601String(),
                'proximo_cobro_at' => optional($subscription->proximo_cobro_at)?->toIso8601String(),
                'cancelled_at' => optional($subscription->cancelled_at)?->toIso8601String(),
            ],
            'days_until_charge' => $daysUntilCharge,
            'usage' => $usage,
            'modules' => $modules,
            'restaurant' => [
                'razon_social' => $ctx->razonSocial(),
                'nombre_comercial' => $ctx->nombreComercial(),
                'slug' => $ctx->slug,
            ],
        ]);
    }

    private function daysUntil(mixed $date): ?int
    {
        if (! $date instanceof CarbonInterface) {
            return null;
        }

        $now = now()->startOfDay();
        $target = $date->copy()->startOfDay();

        return (int) $now->diffInDays($target, false);
    }
}

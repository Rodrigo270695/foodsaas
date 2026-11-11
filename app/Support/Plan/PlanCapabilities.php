<?php

declare(strict_types=1);

namespace App\Support\Plan;

use App\Models\Tenant;

/**
 * Features booleanas del plan activo (facturación electrónica, etc.).
 */
final class PlanCapabilities
{
    public static function facturaElectronica(?Tenant $tenant = null): bool
    {
        return self::boletasElectronicas($tenant) || self::facturasElectronicas($tenant);
    }

    public static function boletasElectronicas(?Tenant $tenant = null): bool
    {
        $plan = PlanLimits::activePlan($tenant);

        return $plan !== null && (bool) $plan->resolveFeature('boletas_electronicas');
    }

    public static function facturasElectronicas(?Tenant $tenant = null): bool
    {
        $plan = PlanLimits::activePlan($tenant);

        return $plan !== null && (bool) $plan->resolveFeature('facturas_electronicas');
    }

    public static function notasCredito(?Tenant $tenant = null): bool
    {
        $plan = PlanLimits::activePlan($tenant);

        return $plan !== null && (bool) $plan->resolveFeature('notas_credito');
    }

    public static function notasDebito(?Tenant $tenant = null): bool
    {
        $plan = PlanLimits::activePlan($tenant);

        return $plan !== null && (bool) $plan->resolveFeature('notas_debito');
    }

    public static function guiasRemision(?Tenant $tenant = null): bool
    {
        $plan = PlanLimits::activePlan($tenant);

        return $plan !== null && (bool) $plan->resolveFeature('guias_remision');
    }

    public static function multiAlmacen(?Tenant $tenant = null): bool
    {
        $plan = PlanLimits::activePlan($tenant);

        return $plan !== null && (bool) $plan->resolveFeature('multi_almacen');
    }

    public static function franquiciaConsolidado(?Tenant $tenant = null): bool
    {
        $plan = PlanLimits::activePlan($tenant);

        return $plan !== null && (bool) $plan->resolveFeature('franquicia_consolidado');
    }

    public static function abastecimientoCentral(?Tenant $tenant = null): bool
    {
        $plan = PlanLimits::activePlan($tenant);

        return $plan !== null && (bool) $plan->resolveFeature('abastecimiento_central');
    }
}

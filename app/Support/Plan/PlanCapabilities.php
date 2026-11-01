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
}

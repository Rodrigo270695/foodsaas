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
        $plan = PlanLimits::activePlan($tenant);

        if ($plan === null) {
            return false;
        }

        return (bool) $plan->resolveFeature('boletas_electronicas')
            || (bool) $plan->resolveFeature('facturas_electronicas');
    }
}

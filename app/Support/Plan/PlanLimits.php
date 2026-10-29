<?php

declare(strict_types=1);

namespace App\Support\Plan;

use App\Models\Tenant;

/**
 * Límites del plan activo del tenant. Stub hasta wiring completo de tenancy/suscripción.
 */
final class PlanLimits
{
    public static function tenant(): ?Tenant
    {
        return null;
    }

    public static function wouldExceed(string $feature, int $adding = 1): bool
    {
        return false;
    }

    public static function message(string $feature): string
    {
        return __('Límite del plan alcanzado.');
    }
}

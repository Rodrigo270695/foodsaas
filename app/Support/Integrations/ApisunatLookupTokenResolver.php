<?php

namespace App\Support\Integrations;

use App\Models\RestaurantSetting;
use App\Support\Fel\ApisunatCredentialResolver;
use Throwable;

/**
 * Token para consultas DNI/RUC (APIs de apoyo Lucode / APISUNAT).
 *
 * Prioridad: variable global en .env → token APISUNAT del restaurante (FEL).
 */
final class ApisunatLookupTokenResolver
{
    public static function resolve(): ?string
    {
        $global = trim((string) config('services.apisunat_lookup.token', ''));
        if ($global !== '') {
            return $global;
        }

        try {
            if (! RestaurantSetting::tableReady()) {
                return null;
            }

            $setting = RestaurantSetting::query()->first();
            if ($setting === null || ! ApisunatCredentialResolver::estaConfigurado($setting)) {
                return null;
            }

            return ApisunatCredentialResolver::fromRestaurantSetting($setting)['token'];
        } catch (Throwable) {
            return null;
        }
    }
}

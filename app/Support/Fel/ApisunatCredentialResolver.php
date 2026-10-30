<?php

namespace App\Support\Fel;

use App\Models\RestaurantSetting;
use Illuminate\Support\Facades\Crypt;
use RuntimeException;
use Throwable;

/**
 * Credenciales APISUNAT (Lucode) por restaurante, cifradas en cfg_restaurant_settings.
 */
final class ApisunatCredentialResolver
{
    /**
     * @return array{token: string, mode: 'sandbox'|'produccion'}
     */
    public static function fromRestaurantSetting(RestaurantSetting $setting): array
    {
        if (! (bool) $setting->apisunat_configurado || empty($setting->apisunat_token_enc)) {
            throw new RuntimeException('Configura el token de APISUNAT en Configuración › General.');
        }

        try {
            $token = Crypt::decryptString($setting->apisunat_token_enc);
        } catch (Throwable) {
            throw new RuntimeException('No se puede descifrar el token de APISUNAT. Revisa la configuración.');
        }

        $mode = in_array($setting->apisunat_mode, ['sandbox', 'produccion'], true)
            ? $setting->apisunat_mode
            : 'sandbox';

        return [
            'token' => $token,
            'mode' => $mode,
        ];
    }

    public static function estaConfigurado(RestaurantSetting $setting): bool
    {
        return (bool) $setting->apisunat_configurado
            && filled($setting->apisunat_token_enc);
    }
}

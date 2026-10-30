<?php

declare(strict_types=1);

namespace App\Support\Restaurante;

use App\Models\RestaurantSetting;
use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Throwable;

/**
 * URLs de logo del restaurante con fallback al branding FoodSaaS.
 */
final class RestaurantBrandingUrls
{
    public static function default(): string
    {
        return asset('logo.png');
    }

    public static function fromSetting(?RestaurantSetting $setting): string
    {
        $logoUrl = $setting?->logo_url;

        if (! is_string($logoUrl) || $logoUrl === '') {
            return self::default();
        }

        return self::withCacheBuster($logoUrl, $setting->updated_at?->timestamp);
    }

    /**
     * @return array{logo_url: string, has_custom_logo: bool}
     */
    public static function resolveForTenant(TenantManager $manager, Tenant $tenant): array
    {
        if (! is_string($tenant->slug) || $tenant->slug === '') {
            return [
                'logo_url' => self::default(),
                'has_custom_logo' => false,
            ];
        }

        try {
            return $manager->runForTenant($tenant, function (): array {
                if (! RestaurantSetting::tableReady()) {
                    return [
                        'logo_url' => self::default(),
                        'has_custom_logo' => false,
                    ];
                }

                $setting = RestaurantSetting::query()->first();
                $hasCustom = is_string($setting?->logo_path) && $setting->logo_path !== '';

                return [
                    'logo_url' => self::fromSetting($setting),
                    'has_custom_logo' => $hasCustom,
                ];
            }, false);
        } catch (Throwable) {
            return [
                'logo_url' => self::default(),
                'has_custom_logo' => false,
            ];
        }
    }

    /**
     * @return array{logo_url: string, updated_at: string|null}
     */
    public static function sharedPayload(?RestaurantSetting $setting): array
    {
        return [
            'logo_url' => self::fromSetting($setting),
            'updated_at' => $setting?->updated_at?->toIso8601String(),
        ];
    }

    private static function withCacheBuster(string $logoUrl, ?int $version): string
    {
        if ($version === null) {
            return $logoUrl;
        }

        $separator = str_contains($logoUrl, '?') ? '&' : '?';

        return $logoUrl.$separator.'v='.$version;
    }
}

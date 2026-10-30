<?php

declare(strict_types=1);

namespace App\Support\Restaurante;

use App\Models\RestaurantSetting;

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

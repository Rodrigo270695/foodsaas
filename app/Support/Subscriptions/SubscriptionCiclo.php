<?php

namespace App\Support\Subscriptions;

final class SubscriptionCiclo
{
    public const MENSUAL = 'mensual';

    public const ANUAL = 'anual';

    /** @var list<string> */
    public const ALL = [self::MENSUAL, self::ANUAL];

    public static function normalize(?string $ciclo, string $default = self::MENSUAL): string
    {
        return is_string($ciclo) && in_array($ciclo, self::ALL, true) ? $ciclo : $default;
    }

    public static function months(string $ciclo): int
    {
        return self::normalize($ciclo) === self::ANUAL ? 12 : 1;
    }

    public static function suggestedPriceFromPlan(float $precioMensual, ?float $precioAnual, string $ciclo): float
    {
        if (self::normalize($ciclo) === self::ANUAL) {
            return (float) ($precioAnual ?? $precioMensual * 12);
        }

        return round($precioMensual, 2);
    }
}

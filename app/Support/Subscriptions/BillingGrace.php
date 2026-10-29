<?php

declare(strict_types=1);

namespace App\Support\Subscriptions;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

final class BillingGrace
{
    public static function days(): int
    {
        return max(1, (int) config('billing.grace_days', 3));
    }

    public static function endsAtFrom(mixed $anchor, ?CarbonInterface $fallback = null): CarbonInterface
    {
        $base = $anchor !== null
            ? Carbon::parse($anchor)
            : Carbon::parse($fallback ?? now());

        return $base->copy()->addDays(self::days());
    }
}

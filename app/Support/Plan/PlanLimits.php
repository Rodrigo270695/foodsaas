<?php

declare(strict_types=1);

namespace App\Support\Plan;

use App\Models\Plan;
use App\Models\Sede;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Límites numéricos del plan activo del tenant.
 *
 * -1 (o menor) en `plan_features.valor_int` = ilimitado.
 */
final class PlanLimits
{
    /** @var list<string> */
    public const INT_LIMIT_FEATURES = [
        'max_sedes',
        'max_usuarios',
        'max_productos',
        'max_mesas',
        'max_pedidos_mes',
    ];

    /** @var array<string, class-string> */
    private const FEATURE_MODELS = [
        'max_sedes' => Sede::class,
        'max_usuarios' => User::class,
    ];

    public static function tenant(): ?Tenant
    {
        return app(TenantManager::class)->current()?->tenant;
    }

    public static function activePlan(?Tenant $tenant = null): ?Plan
    {
        $tenant ??= self::tenant();

        if ($tenant === null) {
            return null;
        }

        $plan = $tenant->activeSubscription()?->plan;

        if ($plan !== null) {
            return $plan;
        }

        return Plan::query()
            ->where('codigo', Plan::CODIGO_FREE)
            ->where('activo', true)
            ->first();
    }

    /**
     * @return int|null null = ilimitado
     */
    public static function intLimit(?Tenant $tenant, string $feature): ?int
    {
        $plan = self::activePlan($tenant);

        if ($plan === null) {
            return null;
        }

        $value = $plan->resolveFeature($feature);

        if (is_numeric($value)) {
            $value = (int) $value;
        }

        if (! is_int($value) || $value < 0) {
            return null;
        }

        return $value;
    }

    public static function currentCount(string $feature, ?Tenant $tenant = null): int
    {
        $model = self::FEATURE_MODELS[$feature] ?? null;

        if ($model === null) {
            return 0;
        }

        try {
            if ($feature === 'max_usuarios' || $feature === 'max_sedes') {
                $tenantId = $tenant?->id ?? self::tenant()?->id;

                if ($tenantId === null) {
                    return 0;
                }

                if ($feature === 'max_usuarios') {
                    return User::query()
                        ->where('tenant_id', $tenantId)
                        ->count();
                }

                return Sede::query()->where('tenant_id', $tenantId)->count();
            }

            if (! self::tableExistsForModel($model)) {
                return 0;
            }

            return $model::query()->count();
        } catch (Throwable $e) {
            report($e);

            return 0;
        }
    }

    public static function wouldExceed(
        string $feature,
        ?Tenant $tenant = null,
        ?int $currentCount = null,
        int $adding = 1,
    ): bool {
        $limit = self::intLimit($tenant, $feature);

        if ($limit === null) {
            return false;
        }

        $currentCount ??= self::currentCount($feature, $tenant);

        return ($currentCount + $adding) > $limit;
    }

    public static function isReached(string $feature, ?Tenant $tenant = null): bool
    {
        return self::wouldExceed($feature, $tenant, null, 1);
    }

    public static function message(string $feature, ?int $limit = null): string
    {
        $limit ??= self::intLimit(self::tenant(), $feature);

        return __('plan.limits.'.$feature, [
            'limit' => $limit ?? 0,
            'plan' => self::activePlan()?->nombre ?? __('plan.limits.unknown_plan'),
        ]);
    }

    /**
     * @return array<string, array{limit: int|null, used: int, remaining: int|null, reached: bool, unlimited: bool, semaphore: string, usage_pct: float|null}>|null
     */
    public static function snapshot(?Tenant $tenant = null): ?array
    {
        $tenant ??= self::tenant();

        if ($tenant === null) {
            return null;
        }

        try {
            $out = [];

            foreach (self::INT_LIMIT_FEATURES as $feature) {
                $limit = self::intLimit($tenant, $feature);
                $used = self::currentCount($feature, $tenant);
                $unlimited = $limit === null;
                $usagePct = (! $unlimited && $limit > 0)
                    ? round(min(999.9, ($used / $limit) * 100), 1)
                    : null;

                $out[$feature] = [
                    'limit' => $limit,
                    'used' => $used,
                    'remaining' => $unlimited ? null : max(0, $limit - $used),
                    'reached' => ! $unlimited && $used >= $limit,
                    'unlimited' => $unlimited,
                    'semaphore' => self::semaphore($used, $limit, $unlimited),
                    'usage_pct' => $usagePct,
                ];
            }

            return $out;
        } catch (Throwable $e) {
            report($e);

            return null;
        }
    }

    private static function semaphore(int $used, ?int $limit, bool $unlimited): string
    {
        if ($unlimited || $limit === null) {
            return 'green';
        }

        if ($used >= $limit) {
            return 'red';
        }

        if ($limit > 0 && ($used / $limit) >= 0.8) {
            return 'yellow';
        }

        return 'green';
    }

    /**
     * @param  class-string  $modelClass
     */
    private static function tableExistsForModel(string $modelClass): bool
    {
        $table = (new $modelClass)->getTable();

        if (DB::getDriverName() === 'pgsql' && str_contains($table, '.')) {
            [$schema, $name] = explode('.', $table, 2);

            return (bool) DB::selectOne(
                'select 1 from information_schema.tables where table_schema = ? and table_name = ? limit 1',
                [$schema, $name],
            );
        }

        $name = str_contains($table, '.')
            ? substr($table, strrpos($table, '.') + 1)
            : $table;

        return Schema::hasTable($name);
    }
}

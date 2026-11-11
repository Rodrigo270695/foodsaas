<?php

declare(strict_types=1);

namespace App\Support\Tenancy;

use App\Models\Tenant;
use App\Support\Plan\PlanLimits;

/**
 * Catálogo de módulos del sidebar / gates FoodSaaS.
 *
 * - `modulos_deshabilitados` en el tenant oculta el módulo.
 * - Features de plan (`modulo_*`) bloquean reportes / delivery / reservas si el plan no las incluye.
 */
final class TenantModuleRegistry
{
    /** @var list<string> */
    public const ALL_KEYS = [
        'salon',
        'pedidos',
        'cocina',
        'caja',
        'ventas',
        'carta',
        'almacen',
        'insumos',
        'documentos',
        'series',
        'notas_baja',
        'resumenes',
        'reportes',
        'delivery',
        'reservas',
        'clientes',
        'sedes',
        'usuarios',
        'roles',
        'config_general',
        'config_suscripcion',
    ];

    /**
     * @return list<array{group: string, modules: list<string>}>
     */
    public static function groups(): array
    {
        return [
            [
                'group' => 'servicio',
                'modules' => ['salon', 'pedidos', 'cocina', 'delivery', 'reservas'],
            ],
            [
                'group' => 'cobros',
                'modules' => ['caja', 'ventas', 'clientes', 'reportes'],
            ],
            [
                'group' => 'catalogo',
                'modules' => ['carta', 'almacen', 'insumos'],
            ],
            [
                'group' => 'facturacion',
                'modules' => ['documentos', 'series', 'notas_baja', 'resumenes'],
            ],
            [
                'group' => 'configuracion',
                'modules' => ['config_general', 'config_suscripcion', 'sedes', 'usuarios', 'roles'],
            ],
        ];
    }

    public static function isValid(string $key): bool
    {
        return in_array($key, self::ALL_KEYS, true);
    }

    /**
     * Feature booleana del plan asociada al módulo (null = sin gate de plan).
     */
    public static function planFeatureKey(string $moduleKey): ?string
    {
        return match ($moduleKey) {
            'reportes' => 'modulo_reportes',
            'delivery' => 'modulo_delivery',
            'reservas' => 'modulo_reservas',
            'insumos' => 'modulo_recetas',
            default => null,
        };
    }

    public static function isEnabled(?Tenant $tenant, string $moduleKey): bool
    {
        if (! self::isValid($moduleKey)) {
            return true;
        }

        $disabled = is_array($tenant?->modulos_deshabilitados)
            ? $tenant->modulos_deshabilitados
            : [];

        if (in_array($moduleKey, $disabled, true)) {
            return false;
        }

        $feature = self::planFeatureKey($moduleKey);
        if ($feature === null) {
            return true;
        }

        $plan = PlanLimits::activePlan($tenant);
        if ($plan === null) {
            return false;
        }

        return (bool) $plan->resolveFeature($feature);
    }

    /**
     * @return array{enabled: array<string, bool>, deshabilitados: list<string>}
     */
    public static function snapshot(?Tenant $tenant): array
    {
        $enabled = [];
        $deshabilitados = [];

        foreach (self::ALL_KEYS as $key) {
            $on = self::isEnabled($tenant, $key);
            $enabled[$key] = $on;
            if (! $on) {
                $deshabilitados[] = $key;
            }
        }

        return [
            'enabled' => $enabled,
            'deshabilitados' => $deshabilitados,
        ];
    }

    /**
     * Grupos para el editor de plataforma (enabled = no está en modulos_deshabilitados).
     * El gate de plan se aplica en runtime aparte.
     *
     * @return list<array{group: string, modules: list<array{key: string, enabled: bool}>}>
     */
    public static function groupsForEditor(?Tenant $tenant): array
    {
        $disabled = is_array($tenant?->modulos_deshabilitados)
            ? $tenant->modulos_deshabilitados
            : [];

        $out = [];
        foreach (self::groups() as $group) {
            $modules = [];
            foreach ($group['modules'] as $key) {
                $modules[] = [
                    'key' => $key,
                    'enabled' => ! in_array($key, $disabled, true),
                ];
            }
            $out[] = [
                'group' => $group['group'],
                'modules' => $modules,
            ];
        }

        return $out;
    }
}

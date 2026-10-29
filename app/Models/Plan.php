<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasUuids;

    public const CODIGO_FREE = 'free';

    /**
     * Catálogo de features vinculables vía `plan_features` (FoodSaaS).
     */
    public const FEATURE_CATALOG = [
        'max_sedes' => ['type' => 'int', 'group' => 'limites', 'default' => 1],
        'max_usuarios' => ['type' => 'int', 'group' => 'limites', 'default' => 3],
        'max_productos' => ['type' => 'int', 'group' => 'limites', 'default' => 200],
        'max_mesas' => ['type' => 'int', 'group' => 'limites', 'default' => 30],
        'max_pedidos_mes' => ['type' => 'int', 'group' => 'limites', 'default' => 500],

        'modulo_inventario' => ['type' => 'bool', 'group' => 'modulos', 'default' => false],
        'modulo_kds' => ['type' => 'bool', 'group' => 'modulos', 'default' => true],
        'modulo_delivery' => ['type' => 'bool', 'group' => 'modulos', 'default' => false],
        'modulo_reservas' => ['type' => 'bool', 'group' => 'modulos', 'default' => false],
        'modulo_reportes' => ['type' => 'bool', 'group' => 'modulos', 'default' => false],
        'multi_sede' => ['type' => 'bool', 'group' => 'modulos', 'default' => false],

        'boletas_electronicas' => ['type' => 'bool', 'group' => 'facturacion', 'default' => false],
        'facturas_electronicas' => ['type' => 'bool', 'group' => 'facturacion', 'default' => false],
        'guias_remision' => ['type' => 'bool', 'group' => 'facturacion', 'default' => false],
        'notas_credito' => ['type' => 'bool', 'group' => 'facturacion', 'default' => false],
        'notas_debito' => ['type' => 'bool', 'group' => 'facturacion', 'default' => false],
        'max_comprobantes_mes' => ['type' => 'int', 'group' => 'facturacion', 'default' => 50],
    ];

    protected $fillable = [
        'codigo',
        'nombre',
        'descripcion',
        'badge',
        'color_hex',
        'precio_mensual',
        'precio_anual',
        'trial_days',
        'referral_reward_days',
        'orden',
        'es_publico',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'precio_mensual' => 'decimal:2',
            'precio_anual' => 'decimal:2',
            'trial_days' => 'integer',
            'referral_reward_days' => 'integer',
            'es_publico' => 'boolean',
            'activo' => 'boolean',
        ];
    }

    public function features(): HasMany
    {
        return $this->hasMany(PlanFeature::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function isFree(): bool
    {
        return $this->codigo === self::CODIGO_FREE;
    }

    /**
     * @param  Builder<Plan>  $query
     * @return Builder<Plan>
     */
    public function scopeExcludingFree(Builder $query): Builder
    {
        return $query->where('codigo', '!=', self::CODIGO_FREE);
    }

    public function resolveFeature(string $feature): int|bool|string|null
    {
        $meta = self::FEATURE_CATALOG[$feature] ?? null;
        if (! $meta) {
            return null;
        }

        /** @var PlanFeature|null $row */
        $row = $this->features()->where('feature', $feature)->first();
        if (! $row) {
            return $meta['default'];
        }

        return match ($meta['type']) {
            'int' => $row->valor_int !== null ? (int) $row->valor_int : null,
            'bool' => $row->valor_bool,
            'str' => $row->valor_str,
            default => null,
        };
    }
}

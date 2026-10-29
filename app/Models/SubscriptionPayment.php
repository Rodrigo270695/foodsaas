<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionPayment extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'subscription_id',
        'tenant_id',
        'plan_id',
        'monto',
        'moneda',
        'igv_monto',
        'descuento_monto',
        'total',
        'estado',
        'pasarela',
        'pasarela_transaction_id',
        'pasarela_response',
        'periodo_inicio',
        'periodo_fin',
        'fel_emitido',
        'fel_numero',
        'error_mensaje',
        'pagado_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'igv_monto' => 'decimal:2',
            'descuento_monto' => 'decimal:2',
            'total' => 'decimal:2',
            'pasarela_response' => 'array',
            'periodo_inicio' => 'datetime',
            'periodo_fin' => 'datetime',
            'fel_emitido' => 'boolean',
            'pagado_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Subscription, $this>
     */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * @return BelongsTo<Plan, $this>
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'plan_id',
        'estado',
        'ciclo',
        'trial_ends_at',
        'current_period_start',
        'current_period_end',
        'grace_ends_at',
        'cancelled_at',
        'cancel_reason',
        'cancel_feedback',
        'precio_pactado',
        'descuento_pct',
        'proximo_cobro_at',
    ];

    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'grace_ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'precio_pactado' => 'decimal:2',
            'descuento_pct' => 'decimal:2',
            'proximo_cobro_at' => 'datetime',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}

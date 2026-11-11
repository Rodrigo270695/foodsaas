<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreditoMovimiento extends Model
{
    use HasUuids;

    public const TIPO_CARGO = 'cargo';

    public const TIPO_ABONO = 'abono';

    public const TIPO_AJUSTE = 'ajuste';

    protected $table = 'crm_credito_movimientos';

    protected $fillable = [
        'cliente_id',
        'tipo',
        'monto',
        'saldo_resultante',
        'motivo',
        'referencia_tipo',
        'referencia_id',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'saldo_resultante' => 'decimal:2',
        ];
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }
}

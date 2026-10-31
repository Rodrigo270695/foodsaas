<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $venta_id
 * @property string $medio
 * @property string $monto
 */
class Pago extends Model
{
    use HasUuids;

    public const MEDIO_EFECTIVO = 'efectivo';

    public const MEDIO_TARJETA = 'tarjeta';

    public const MEDIO_YAPE = 'yape';

    public const MEDIO_PLIN = 'plin';

    public const MEDIO_TRANSFERENCIA = 'transferencia';

    public const MEDIO_AGORA = 'agora';

    public const MEDIO_SIP = 'sip';

    public const MEDIO_OTRO = 'otro';

    public const MEDIOS = [
        self::MEDIO_EFECTIVO,
        self::MEDIO_TARJETA,
        self::MEDIO_YAPE,
        self::MEDIO_PLIN,
        self::MEDIO_TRANSFERENCIA,
        self::MEDIO_AGORA,
        self::MEDIO_SIP,
        self::MEDIO_OTRO,
    ];

    /** Billeteras digitales (sin efectivo ni tarjeta POS). */
    public const BILLETERAS = [
        self::MEDIO_YAPE,
        self::MEDIO_PLIN,
        self::MEDIO_TRANSFERENCIA,
        self::MEDIO_AGORA,
        self::MEDIO_SIP,
    ];

    protected $table = 'fin_pagos';

    protected $fillable = [
        'venta_id',
        'medio',
        'monto',
        'referencia',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Venta, $this>
     */
    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class, 'venta_id');
    }
}

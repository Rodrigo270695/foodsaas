<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $sede_id
 * @property string|null $pedido_id
 * @property string|null $caja_sesion_id
 * @property string|null $numero
 * @property string $origen
 * @property string $tipo_comprobante
 * @property string|null $cliente_nombre
 * @property string|null $cliente_documento
 * @property string $estado
 * @property string $total
 */
class Venta extends Model
{
    use HasUuids;

    public const ESTADO_PAGADA = 'pagada';

    public const ESTADO_ANULADA = 'anulada';

    public const ORIGEN_PEDIDO = 'pedido';

    public const ORIGEN_RAPIDA = 'rapida';

    public const TIPO_TICKET = 'ticket';

    public const TIPO_BOLETA = 'boleta';

    public const TIPO_FACTURA = 'factura';

    public const TIPOS_COMPROBANTE = [
        self::TIPO_TICKET,
        self::TIPO_BOLETA,
        self::TIPO_FACTURA,
    ];

    protected $table = 'fin_ventas';

    protected $fillable = [
        'sede_id',
        'pedido_id',
        'caja_sesion_id',
        'numero',
        'origen',
        'tipo_comprobante',
        'cliente_nombre',
        'cliente_documento',
        'estado',
        'subtotal',
        'descuento',
        'total',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'descuento' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Sede, $this>
     */
    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    /**
     * @return BelongsTo<Pedido, $this>
     */
    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'pedido_id');
    }

    /**
     * @return BelongsTo<CajaSesion, $this>
     */
    public function cajaSesion(): BelongsTo
    {
        return $this->belongsTo(CajaSesion::class, 'caja_sesion_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Pago, $this>
     */
    public function pagos(): HasMany
    {
        return $this->hasMany(Pago::class, 'venta_id');
    }
}

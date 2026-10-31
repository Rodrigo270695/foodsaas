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
 * @property string $estado
 * @property string $total
 */
class Venta extends Model
{
    use HasUuids;

    public const ESTADO_PAGADA = 'pagada';

    public const ESTADO_ANULADA = 'anulada';

    protected $table = 'fin_ventas';

    protected $fillable = [
        'sede_id',
        'pedido_id',
        'caja_sesion_id',
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

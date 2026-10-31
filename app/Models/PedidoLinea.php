<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $pedido_id
 * @property string|null $producto_id
 * @property string|null $area_id
 * @property string $nombre
 * @property string $precio_unitario
 * @property string $cantidad
 * @property string $importe
 * @property string $estado
 */
class PedidoLinea extends Model
{
    use HasUuids;

    public const ESTADO_PENDIENTE = 'pendiente';

    public const ESTADO_EN_COLA = 'en_cola';

    public const ESTADO_LISTO = 'listo';

    public const ESTADO_ANULADO = 'anulado';

    public const ESTADOS_COCINA = [
        self::ESTADO_EN_COLA,
        self::ESTADO_LISTO,
    ];

    protected $table = 'ope_pedido_lineas';

    protected $fillable = [
        'pedido_id',
        'producto_id',
        'area_id',
        'nombre',
        'precio_unitario',
        'cantidad',
        'importe',
        'estado',
        'notas',
        'orden',
        'enviado_at',
        'listo_at',
    ];

    protected function casts(): array
    {
        return [
            'precio_unitario' => 'decimal:2',
            'cantidad' => 'decimal:3',
            'importe' => 'decimal:2',
            'orden' => 'integer',
            'enviado_at' => 'datetime',
            'listo_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Pedido, $this>
     */
    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'pedido_id');
    }

    /**
     * @return BelongsTo<ProductoCarta, $this>
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(ProductoCarta::class, 'producto_id');
    }

    /**
     * @return BelongsTo<AreaCarta, $this>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(AreaCarta::class, 'area_id');
    }
}

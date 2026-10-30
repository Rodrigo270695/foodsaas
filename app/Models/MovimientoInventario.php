<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $producto_id
 * @property string $tipo
 * @property string $cantidad
 * @property string $stock_anterior
 * @property string $stock_despues
 */
class MovimientoInventario extends Model
{
    use HasUuids;

    public const TIPO_ENTRADA = 'entrada';

    public const TIPO_SALIDA = 'salida';

    public const TIPO_AJUSTE = 'ajuste';

    public const TIPO_MERMA = 'merma';

    public const TIPO_VENTA = 'venta';

    public const TIPOS = [
        self::TIPO_ENTRADA,
        self::TIPO_SALIDA,
        self::TIPO_AJUSTE,
        self::TIPO_MERMA,
        self::TIPO_VENTA,
    ];

    protected $table = 'inv_movimientos';

    protected $fillable = [
        'producto_id',
        'tipo',
        'cantidad',
        'stock_anterior',
        'stock_despues',
        'motivo',
        'referencia_tipo',
        'referencia_id',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
            'stock_anterior' => 'decimal:3',
            'stock_despues' => 'decimal:3',
        ];
    }

    /**
     * @return BelongsTo<ProductoCarta, $this>
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(ProductoCarta::class, 'producto_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

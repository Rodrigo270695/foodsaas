<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $compra_id
 * @property string $linea_tipo
 * @property string|null $insumo_id
 * @property string|null $producto_id
 * @property string $cantidad
 * @property string $cantidad_recibida
 * @property string $costo_unitario
 * @property string $unidad
 */
class CompraLinea extends Model
{
    use HasUuids;

    public const TIPO_INSUMO = 'insumo';

    public const TIPO_PRODUCTO = 'producto';

    public const TIPOS = [
        self::TIPO_INSUMO,
        self::TIPO_PRODUCTO,
    ];

    protected $table = 'log_compra_lineas';

    protected $fillable = [
        'compra_id',
        'linea_tipo',
        'insumo_id',
        'producto_id',
        'cantidad',
        'cantidad_recibida',
        'costo_unitario',
        'unidad',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
            'cantidad_recibida' => 'decimal:3',
            'costo_unitario' => 'decimal:4',
        ];
    }

    public function pendiente(): float
    {
        return max(0, round((float) $this->cantidad - (float) $this->cantidad_recibida, 3));
    }

    /**
     * @return BelongsTo<Compra, $this>
     */
    public function compra(): BelongsTo
    {
        return $this->belongsTo(Compra::class, 'compra_id');
    }

    /**
     * @return BelongsTo<Insumo, $this>
     */
    public function insumo(): BelongsTo
    {
        return $this->belongsTo(Insumo::class, 'insumo_id');
    }

    /**
     * @return BelongsTo<ProductoCarta, $this>
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(ProductoCarta::class, 'producto_id');
    }
}

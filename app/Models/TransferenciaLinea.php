<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferenciaLinea extends Model
{
    use HasUuids;

    public const TIPO_INSUMO = 'insumo';

    public const TIPO_PRODUCTO = 'producto';

    protected $table = 'log_transferencia_lineas';

    protected $fillable = [
        'transferencia_id',
        'linea_tipo',
        'origen_insumo_id',
        'destino_insumo_id',
        'origen_producto_id',
        'destino_producto_id',
        'cantidad',
        'unidad',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
        ];
    }

    public function transferencia(): BelongsTo
    {
        return $this->belongsTo(Transferencia::class, 'transferencia_id');
    }

    public function origenInsumo(): BelongsTo
    {
        return $this->belongsTo(Insumo::class, 'origen_insumo_id');
    }

    public function destinoInsumo(): BelongsTo
    {
        return $this->belongsTo(Insumo::class, 'destino_insumo_id');
    }

    public function origenProducto(): BelongsTo
    {
        return $this->belongsTo(ProductoCarta::class, 'origen_producto_id');
    }

    public function destinoProducto(): BelongsTo
    {
        return $this->belongsTo(ProductoCarta::class, 'destino_producto_id');
    }
}

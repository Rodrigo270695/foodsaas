<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string|null $sede_id
 * @property string $nombre
 * @property string $unidad
 * @property string $stock
 * @property string|null $stock_minimo
 * @property string $costo_unitario
 * @property bool $activo
 */
class Insumo extends Model
{
    use HasUuids;

    protected $table = 'inv_insumos';

    protected $fillable = [
        'sede_id',
        'nombre',
        'unidad',
        'stock',
        'stock_minimo',
        'costo_unitario',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'stock' => 'decimal:3',
            'stock_minimo' => 'decimal:3',
            'costo_unitario' => 'decimal:4',
            'activo' => 'boolean',
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
     * @return HasMany<MovimientoInventario, $this>
     */
    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class, 'insumo_id');
    }

    /**
     * @return HasMany<RecetaLinea, $this>
     */
    public function recetaLineas(): HasMany
    {
        return $this->hasMany(RecetaLinea::class, 'insumo_id');
    }
}

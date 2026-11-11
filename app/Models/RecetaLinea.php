<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $receta_id
 * @property string $insumo_id
 * @property string $cantidad
 */
class RecetaLinea extends Model
{
    use HasUuids;

    protected $table = 'inv_receta_lineas';

    protected $fillable = [
        'receta_id',
        'insumo_id',
        'cantidad',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
        ];
    }

    /**
     * @return BelongsTo<Receta, $this>
     */
    public function receta(): BelongsTo
    {
        return $this->belongsTo(Receta::class, 'receta_id');
    }

    /**
     * @return BelongsTo<Insumo, $this>
     */
    public function insumo(): BelongsTo
    {
        return $this->belongsTo(Insumo::class, 'insumo_id');
    }
}

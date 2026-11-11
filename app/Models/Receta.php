<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $producto_id
 * @property string|null $notas
 */
class Receta extends Model
{
    use HasUuids;

    protected $table = 'inv_recetas';

    protected $fillable = [
        'producto_id',
        'notas',
    ];

    /**
     * @return BelongsTo<ProductoCarta, $this>
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(ProductoCarta::class, 'producto_id');
    }

    /**
     * @return HasMany<RecetaLinea, $this>
     */
    public function lineas(): HasMany
    {
        return $this->hasMany(RecetaLinea::class, 'receta_id');
    }
}

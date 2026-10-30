<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Estación de producción (Cocina, Bar, Postres…).
 *
 * @property string $id
 * @property string $nombre
 */
class AreaCarta extends Model
{
    use HasUuids;

    protected $table = 'cat_areas';

    protected $fillable = [
        'sede_id',
        'nombre',
        'orden',
        'activa',
    ];

    protected function casts(): array
    {
        return [
            'orden' => 'integer',
            'activa' => 'boolean',
        ];
    }

    /**
     * @return HasMany<ProductoCarta, $this>
     */
    public function productos(): HasMany
    {
        return $this->hasMany(ProductoCarta::class, 'area_id');
    }
}

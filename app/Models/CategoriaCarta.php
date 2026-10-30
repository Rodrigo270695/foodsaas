<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $nombre
 */
class CategoriaCarta extends Model
{
    use HasUuids;

    protected $table = 'cat_categorias';

    protected $fillable = [
        'sede_id',
        'nombre',
        'descripcion',
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
        return $this->hasMany(ProductoCarta::class, 'categoria_id');
    }
}

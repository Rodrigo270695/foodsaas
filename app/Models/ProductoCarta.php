<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $categoria_id
 * @property string $nombre
 * @property string $precio
 */
class ProductoCarta extends Model
{
    use HasUuids;

    protected $table = 'cat_productos';

    protected $fillable = [
        'categoria_id',
        'nombre',
        'descripcion',
        'codigo',
        'precio',
        'orden',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'precio' => 'decimal:2',
            'orden' => 'integer',
            'activo' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<CategoriaCarta, $this>
     */
    public function categoria(): BelongsTo
    {
        return $this->belongsTo(CategoriaCarta::class, 'categoria_id');
    }
}

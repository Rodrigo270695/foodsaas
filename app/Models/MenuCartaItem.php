<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $carta_id
 * @property string $producto_id
 */
class MenuCartaItem extends Model
{
    use HasUuids;

    protected $table = 'men_carta_items';

    protected $fillable = [
        'carta_id',
        'producto_id',
        'pagina',
        'orden',
        'notas',
    ];

    protected function casts(): array
    {
        return [
            'pagina' => 'integer',
            'orden' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<MenuCarta, $this>
     */
    public function carta(): BelongsTo
    {
        return $this->belongsTo(MenuCarta::class, 'carta_id');
    }

    /**
     * @return BelongsTo<ProductoCarta, $this>
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(ProductoCarta::class, 'producto_id');
    }
}

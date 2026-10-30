<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * @property string $id
 * @property string $categoria_id
 * @property string|null $area_id
 * @property string $nombre
 * @property string $precio
 * @property string|null $imagen_path
 * @property string $control_inventario
 * @property string|null $stock
 * @property string|null $stock_minimo
 */
class ProductoCarta extends Model
{
    use HasUuids;

    public const CONTROL_NONE = 'none';

    public const CONTROL_SKU = 'sku';

    public const CONTROL_RECIPE = 'recipe';

    public const CONTROLES = [
        self::CONTROL_NONE,
        self::CONTROL_SKU,
        self::CONTROL_RECIPE,
    ];

    protected $table = 'cat_productos';

    protected $fillable = [
        'sede_id',
        'categoria_id',
        'area_id',
        'nombre',
        'descripcion',
        'imagen_path',
        'codigo',
        'precio',
        'orden',
        'activo',
        'control_inventario',
        'stock',
        'stock_minimo',
    ];

    protected $appends = [
        'imagen_url',
    ];

    protected function casts(): array
    {
        return [
            'precio' => 'decimal:2',
            'orden' => 'integer',
            'activo' => 'boolean',
            'stock' => 'decimal:3',
            'stock_minimo' => 'decimal:3',
        ];
    }

    public function tracksSkuStock(): bool
    {
        return $this->control_inventario === self::CONTROL_SKU;
    }

    public function getImagenUrlAttribute(): ?string
    {
        if (! $this->imagen_path) {
            return null;
        }

        return asset('storage/'.$this->imagen_path);
    }

    /**
     * @return BelongsTo<CategoriaCarta, $this>
     */
    public function categoria(): BelongsTo
    {
        return $this->belongsTo(CategoriaCarta::class, 'categoria_id');
    }

    /**
     * @return BelongsTo<AreaCarta, $this>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(AreaCarta::class, 'area_id');
    }

    /**
     * @return HasMany<MovimientoInventario, $this>
     */
    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class, 'producto_id');
    }

    public function deleteImagenFile(): void
    {
        if (! $this->imagen_path) {
            return;
        }

        $disk = Storage::disk('public');
        if ($disk->exists($this->imagen_path)) {
            $disk->delete($this->imagen_path);
        }
    }
}

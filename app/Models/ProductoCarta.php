<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * @property string $id
 * @property string $categoria_id
 * @property string|null $area_id
 * @property string $nombre
 * @property string $precio
 * @property string|null $imagen_path
 */
class ProductoCarta extends Model
{
    use HasUuids;

    protected $table = 'cat_productos';

    protected $fillable = [
        'categoria_id',
        'area_id',
        'nombre',
        'descripcion',
        'imagen_path',
        'codigo',
        'precio',
        'orden',
        'activo',
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
        ];
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

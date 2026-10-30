<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Carta publicable (capa de diseño).
 *
 * @property string $id
 * @property string $nombre
 * @property string $slug
 */
class MenuCarta extends Model
{
    use HasUuids;

    protected $table = 'men_cartas';

    protected $fillable = [
        'sede_id',
        'nombre',
        'slug',
        'descripcion',
        'fondo_preset',
        'paginas',
        'publicada',
        'vigente_desde',
        'vigente_hasta',
    ];

    protected function casts(): array
    {
        return [
            'paginas' => 'integer',
            'publicada' => 'boolean',
            'vigente_desde' => 'date',
            'vigente_hasta' => 'date',
        ];
    }

    /**
     * @return HasMany<MenuCartaItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(MenuCartaItem::class, 'carta_id')->orderBy('pagina')->orderBy('orden');
    }

    public static function uniqueSlug(string $nombre, ?string $ignoreId = null): string
    {
        $base = Str::slug($nombre);
        if ($base === '') {
            $base = 'carta';
        }

        $slug = $base;
        $i = 2;
        while (
            static::query()
                ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }
}

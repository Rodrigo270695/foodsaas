<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
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
 * @property-read ?string $fondo_imagen_url
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
        'fondo_imagen_path',
        'tipografia',
        'color_texto',
        'paginas',
        'publicada',
        'vigente_desde',
        'vigente_hasta',
    ];

    protected $appends = ['fondo_imagen_url'];

    protected function casts(): array
    {
        return [
            'paginas' => 'integer',
            'publicada' => 'boolean',
            'vigente_desde' => 'date',
            'vigente_hasta' => 'date',
        ];
    }

    protected function fondoImagenUrl(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->fondo_imagen_path
                ? asset('storage/'.ltrim((string) $this->fondo_imagen_path, '/'))
                : null,
        );
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

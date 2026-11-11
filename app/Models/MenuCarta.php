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
        'dias_semana',
    ];

    protected $appends = ['fondo_imagen_url'];

    protected function casts(): array
    {
        return [
            'paginas' => 'integer',
            'publicada' => 'boolean',
            'vigente_desde' => 'date',
            'vigente_hasta' => 'date',
            'dias_semana' => 'array',
        ];
    }

    /**
     * @param  \Carbon\CarbonInterface|null  $at
     */
    public function isVigenteAhora($at = null): bool
    {
        $at ??= now();
        $hoy = $at->toDateString();

        if ($this->vigente_desde !== null && $hoy < $this->vigente_desde->toDateString()) {
            return false;
        }

        if ($this->vigente_hasta !== null && $hoy > $this->vigente_hasta->toDateString()) {
            return false;
        }

        $dias = $this->dias_semana;
        if (is_array($dias) && $dias !== []) {
            // ISO: 1=lunes … 7=domingo
            $dow = (int) $at->dayOfWeekIso;
            $normalized = array_map('intval', $dias);
            if (! in_array($dow, $normalized, true)) {
                return false;
            }
        }

        return true;
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

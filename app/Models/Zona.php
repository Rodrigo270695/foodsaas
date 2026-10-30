<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $sede_id
 * @property string $nombre
 */
class Zona extends Model
{
    use HasUuids;

    protected $table = 'cfg_zonas';

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
     * @return BelongsTo<Sede, $this>
     */
    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    /**
     * @return HasMany<Mesa, $this>
     */
    public function mesas(): HasMany
    {
        return $this->hasMany(Mesa::class, 'zona_id');
    }
}

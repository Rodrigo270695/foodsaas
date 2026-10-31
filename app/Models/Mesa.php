<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $sede_id
 * @property string $zona_id
 * @property string $codigo
 */
class Mesa extends Model
{
    use HasUuids;

    protected $table = 'cfg_mesas';

    protected $fillable = [
        'sede_id',
        'zona_id',
        'codigo',
        'nombre',
        'capacidad',
        'activa',
        'union_id',
    ];

    protected function casts(): array
    {
        return [
            'capacidad' => 'integer',
            'activa' => 'boolean',
        ];
    }

    public function isJoined(): bool
    {
        return is_string($this->union_id) && $this->union_id !== '';
    }

    /**
     * @return BelongsTo<Sede, $this>
     */
    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    /**
     * @return BelongsTo<Zona, $this>
     */
    public function zona(): BelongsTo
    {
        return $this->belongsTo(Zona::class, 'zona_id');
    }

    /**
     * @return HasMany<Pedido, $this>
     */
    public function pedidos(): HasMany
    {
        return $this->hasMany(Pedido::class, 'mesa_id');
    }
}

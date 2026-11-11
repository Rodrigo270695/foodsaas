<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string|null $sede_id
 * @property string $nombre
 * @property string|null $ruc
 * @property string|null $telefono
 * @property string|null $email
 * @property string|null $notas
 * @property bool $activo
 */
class Proveedor extends Model
{
    use HasUuids;

    protected $table = 'log_proveedores';

    protected $fillable = [
        'sede_id',
        'nombre',
        'ruc',
        'telefono',
        'email',
        'notas',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
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
     * @return HasMany<Compra, $this>
     */
    public function compras(): HasMany
    {
        return $this->hasMany(Compra::class, 'proveedor_id');
    }
}

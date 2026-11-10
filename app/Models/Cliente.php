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
 * @property string|null $documento
 * @property string|null $telefono
 * @property string|null $email
 * @property string|null $notas
 */
class Cliente extends Model
{
    use HasUuids;

    protected $table = 'crm_clientes';

    protected $fillable = [
        'sede_id',
        'nombre',
        'documento',
        'telefono',
        'email',
        'notas',
    ];

    /**
     * @return BelongsTo<Sede, $this>
     */
    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    /**
     * @return HasMany<Reserva, $this>
     */
    public function reservas(): HasMany
    {
        return $this->hasMany(Reserva::class, 'cliente_id');
    }
}

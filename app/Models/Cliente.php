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
 * @property string|null $documento_tipo
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
        'documento_tipo',
        'documento',
        'telefono',
        'email',
        'notas',
        'saldo_credito',
    ];

    protected function casts(): array
    {
        return [
            'saldo_credito' => 'decimal:2',
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
     * @return HasMany<Reserva, $this>
     */
    public function reservas(): HasMany
    {
        return $this->hasMany(Reserva::class, 'cliente_id');
    }

    /**
     * @return HasMany<CreditoMovimiento, $this>
     */
    public function creditoMovimientos(): HasMany
    {
        return $this->hasMany(CreditoMovimiento::class, 'cliente_id')->orderByDesc('created_at');
    }
}

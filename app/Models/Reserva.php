<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $sede_id
 * @property string|null $mesa_id
 * @property string|null $cliente_id
 * @property string $cliente_nombre
 * @property string|null $cliente_telefono
 * @property int $personas
 * @property \Illuminate\Support\Carbon $reserved_at
 * @property string $estado
 * @property string|null $notas
 * @property int|null $created_by
 */
class Reserva extends Model
{
    use HasUuids;

    public const ESTADO_PENDIENTE = 'pendiente';

    public const ESTADO_CONFIRMADA = 'confirmada';

    public const ESTADO_SENTADA = 'sentada';

    public const ESTADO_CANCELADA = 'cancelada';

    public const ESTADO_NO_SHOW = 'no_show';

    public const ESTADOS = [
        self::ESTADO_PENDIENTE,
        self::ESTADO_CONFIRMADA,
        self::ESTADO_SENTADA,
        self::ESTADO_CANCELADA,
        self::ESTADO_NO_SHOW,
    ];

    protected $table = 'ope_reservas';

    protected $fillable = [
        'sede_id',
        'mesa_id',
        'cliente_id',
        'cliente_nombre',
        'cliente_telefono',
        'personas',
        'reserved_at',
        'estado',
        'notas',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'personas' => 'integer',
            'reserved_at' => 'datetime',
            'created_by' => 'integer',
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
     * @return BelongsTo<Mesa, $this>
     */
    public function mesa(): BelongsTo
    {
        return $this->belongsTo(Mesa::class, 'mesa_id');
    }

    /**
     * @return BelongsTo<Cliente, $this>
     */
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

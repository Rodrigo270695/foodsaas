<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transferencia extends Model
{
    use HasUuids;

    public const ESTADO_BORRADOR = 'borrador';

    public const ESTADO_ENVIADA = 'enviada';

    public const ESTADO_RECIBIDA = 'recibida';

    public const ESTADO_ANULADA = 'anulada';

    public const ESTADOS = [
        self::ESTADO_BORRADOR,
        self::ESTADO_ENVIADA,
        self::ESTADO_RECIBIDA,
        self::ESTADO_ANULADA,
    ];

    protected $table = 'log_transferencias';

    protected $fillable = [
        'sede_origen_id',
        'sede_destino_id',
        'numero',
        'estado',
        'notas',
        'user_id',
        'enviada_at',
        'recibida_at',
    ];

    protected function casts(): array
    {
        return [
            'numero' => 'integer',
            'enviada_at' => 'datetime',
            'recibida_at' => 'datetime',
        ];
    }

    public function isEditable(): bool
    {
        return $this->estado === self::ESTADO_BORRADOR;
    }

    public function canEnviar(): bool
    {
        return $this->estado === self::ESTADO_BORRADOR && $this->lineas()->exists();
    }

    public function canRecibir(): bool
    {
        return $this->estado === self::ESTADO_ENVIADA;
    }

    public function canAnular(): bool
    {
        return in_array($this->estado, [self::ESTADO_BORRADOR, self::ESTADO_ENVIADA], true);
    }

    public function sedeOrigen(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_origen_id');
    }

    public function sedeDestino(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_destino_id');
    }

    public function lineas(): HasMany
    {
        return $this->hasMany(TransferenciaLinea::class, 'transferencia_id')->orderBy('created_at');
    }
}

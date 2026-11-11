<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RequerimientoAbastecimiento extends Model
{
    use HasUuids;

    public const ESTADO_BORRADOR = 'borrador';

    public const ESTADO_SOLICITADO = 'solicitado';

    public const ESTADO_APROBADO = 'aprobado';

    public const ESTADO_ATENDIDO = 'atendido';

    public const ESTADO_RECHAZADO = 'rechazado';

    public const ESTADO_ANULADO = 'anulado';

    public const ESTADOS = [
        self::ESTADO_BORRADOR,
        self::ESTADO_SOLICITADO,
        self::ESTADO_APROBADO,
        self::ESTADO_ATENDIDO,
        self::ESTADO_RECHAZADO,
        self::ESTADO_ANULADO,
    ];

    protected $table = 'log_requerimientos';

    protected $fillable = [
        'sede_solicitante_id',
        'sede_abastecedora_id',
        'numero',
        'estado',
        'prioridad',
        'fecha_necesaria',
        'notas',
        'transferencia_id',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'numero' => 'integer',
            'fecha_necesaria' => 'date',
        ];
    }

    public function isEditable(): bool
    {
        return $this->estado === self::ESTADO_BORRADOR;
    }

    public function sedeSolicitante(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_solicitante_id');
    }

    public function sedeAbastecedora(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_abastecedora_id');
    }

    public function transferencia(): BelongsTo
    {
        return $this->belongsTo(Transferencia::class, 'transferencia_id');
    }

    public function lineas(): HasMany
    {
        return $this->hasMany(RequerimientoLinea::class, 'requerimiento_id')->orderBy('created_at');
    }
}

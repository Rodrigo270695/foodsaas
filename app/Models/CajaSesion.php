<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $sede_id
 * @property string $estado
 * @property string $moneda
 * @property string $monto_apertura
 * @property array<string, string>|null $saldos_apertura_json
 * @property string|null $notas_apertura
 */
class CajaSesion extends Model
{
    use HasUuids;

    public const ESTADO_ABIERTA = 'abierta';

    public const ESTADO_CERRADA = 'cerrada';

    protected $table = 'fin_caja_sesiones';

    protected $fillable = [
        'sede_id',
        'estado',
        'moneda',
        'monto_apertura',
        'saldos_apertura_json',
        'notas_apertura',
        'monto_cierre_sistema',
        'monto_cierre_contado',
        'notas_cierre',
        'opened_by',
        'closed_by',
        'opened_at',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'monto_apertura' => 'decimal:2',
            'saldos_apertura_json' => 'array',
            'monto_cierre_sistema' => 'decimal:2',
            'monto_cierre_contado' => 'decimal:2',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function isAbierta(): bool
    {
        return $this->estado === self::ESTADO_ABIERTA;
    }

    /**
     * @return BelongsTo<Sede, $this>
     */
    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    /**
     * @return HasMany<Venta, $this>
     */
    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class, 'caja_sesion_id');
    }

    /**
     * @return HasMany<CajaEgreso, $this>
     */
    public function egresos(): HasMany
    {
        return $this->hasMany(CajaEgreso::class, 'caja_sesion_id')->orderByDesc('created_at');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $sede_id
 * @property string $estado
 * @property string $moneda
 * @property string $monto_apertura
 * @property array<string, string>|null $saldos_apertura_json
 * @property string|null $notas_apertura
 * @property string|null $monto_cierre_sistema
 * @property string|null $monto_cierre_contado
 * @property array<string, string>|null $saldos_cierre_json
 * @property array<string, mixed>|null $arqueo_json
 * @property string|null $notas_cierre
 * @property Carbon|null $opened_at
 * @property Carbon|null $closed_at
 */
class CajaSesion extends Model
{
    use HasUuids;

    public const ESTADO_ABIERTA = 'abierta';

    public const ESTADO_CERRADA = 'cerrada';

    /** Horas máximas tras el cierre para volver a abrir la misma sesión. */
    public const REABRIR_HORAS = 24;

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
        'saldos_cierre_json',
        'arqueo_json',
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
            'saldos_cierre_json' => 'array',
            'arqueo_json' => 'array',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function isAbierta(): bool
    {
        return $this->estado === self::ESTADO_ABIERTA;
    }

    /**
     * Solo sesiones cerradas cuyo cierre fue hace menos de REABRIR_HORAS.
     * En el límite exacto ya no se permite reaperturar.
     */
    public function estaDentroDeVentanaReabrir(?Carbon $now = null): bool
    {
        if ($this->estado !== self::ESTADO_CERRADA || $this->closed_at === null) {
            return false;
        }

        $now ??= now();

        return $now->lt($this->closed_at->copy()->addHours(self::REABRIR_HORAS));
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

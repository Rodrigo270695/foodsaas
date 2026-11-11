<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $sede_id
 * @property string|null $proveedor_id
 * @property int $numero
 * @property string $estado
 * @property string $fecha
 * @property string|null $notas
 * @property string $total
 * @property int|null $user_id
 */
class Compra extends Model
{
    use HasUuids;

    public const ESTADO_BORRADOR = 'borrador';

    public const ESTADO_ENVIADA = 'enviada';

    public const ESTADO_PARCIAL = 'parcial';

    public const ESTADO_RECIBIDA = 'recibida';

    public const ESTADO_ANULADA = 'anulada';

    public const ESTADOS = [
        self::ESTADO_BORRADOR,
        self::ESTADO_ENVIADA,
        self::ESTADO_PARCIAL,
        self::ESTADO_RECIBIDA,
        self::ESTADO_ANULADA,
    ];

    protected $table = 'log_compras';

    protected $fillable = [
        'sede_id',
        'proveedor_id',
        'numero',
        'estado',
        'fecha',
        'notas',
        'total',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'numero' => 'integer',
            'fecha' => 'date',
            'total' => 'decimal:2',
        ];
    }

    public function isEditable(): bool
    {
        return $this->estado === self::ESTADO_BORRADOR;
    }

    public function canEmitir(): bool
    {
        return $this->estado === self::ESTADO_BORRADOR;
    }

    public function canRecibir(): bool
    {
        return in_array($this->estado, [self::ESTADO_ENVIADA, self::ESTADO_PARCIAL], true);
    }

    public function canAnular(): bool
    {
        return in_array($this->estado, [self::ESTADO_BORRADOR, self::ESTADO_ENVIADA], true)
            && $this->lineas()->where('cantidad_recibida', '>', 0)->doesntExist();
    }

    /**
     * @return BelongsTo<Sede, $this>
     */
    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }

    /**
     * @return BelongsTo<Proveedor, $this>
     */
    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return HasMany<CompraLinea, $this>
     */
    public function lineas(): HasMany
    {
        return $this->hasMany(CompraLinea::class, 'compra_id');
    }
}

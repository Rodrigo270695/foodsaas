<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property string $id
 * @property string $sede_id
 * @property string|null $mesa_id
 * @property int $numero
 * @property string $estado
 * @property string $canal
 * @property string $subtotal
 * @property string $descuento
 * @property string $total
 */
class Pedido extends Model
{
    use HasUuids;

    public const ESTADO_BORRADOR = 'borrador';

    public const ESTADO_ABIERTO = 'abierto';

    public const ESTADO_CERRADO = 'cerrado';

    public const ESTADO_ANULADO = 'anulado';

    public const ESTADOS_ACTIVOS = [
        self::ESTADO_BORRADOR,
        self::ESTADO_ABIERTO,
    ];

    public const CANAL_SALON = 'salon';

    public const CANAL_MOSTRADOR = 'mostrador';

    public const CANAL_DELIVERY = 'delivery';

    protected $table = 'ope_pedidos';

    protected $fillable = [
        'sede_id',
        'mesa_id',
        'numero',
        'estado',
        'comensales',
        'canal',
        'notas',
        'subtotal',
        'descuento',
        'total',
        'opened_by',
        'enviado_at',
        'cerrado_at',
    ];

    protected function casts(): array
    {
        return [
            'numero' => 'integer',
            'comensales' => 'integer',
            'subtotal' => 'decimal:2',
            'descuento' => 'decimal:2',
            'total' => 'decimal:2',
            'enviado_at' => 'datetime',
            'cerrado_at' => 'datetime',
        ];
    }

    public function isActivo(): bool
    {
        return in_array($this->estado, self::ESTADOS_ACTIVOS, true);
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
     * @return BelongsTo<User, $this>
     */
    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    /**
     * @return HasMany<PedidoLinea, $this>
     */
    public function lineas(): HasMany
    {
        return $this->hasMany(PedidoLinea::class, 'pedido_id')->orderBy('orden')->orderBy('created_at');
    }

    /**
     * @return HasOne<Venta, $this>
     */
    public function venta(): HasOne
    {
        return $this->hasOne(Venta::class, 'pedido_id');
    }
}

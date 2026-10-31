<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Salida de efectivo/billetera en una sesión de caja abierta.
 *
 * @property string $id
 * @property string $caja_sesion_id
 * @property string $monto
 * @property string $medio
 * @property string $motivo
 * @property string|null $notas
 * @property int|null $created_by
 */
class CajaEgreso extends Model
{
    use HasUuids;

    public const MOTIVO_INSUMOS = 'insumos';

    public const MOTIVO_DELIVERY = 'delivery';

    public const MOTIVO_SERVICIOS = 'servicios';

    public const MOTIVO_PERSONAL = 'personal';

    public const MOTIVO_CAMBIO = 'cambio';

    public const MOTIVO_OTROS = 'otros';

    public const MOTIVOS = [
        self::MOTIVO_INSUMOS,
        self::MOTIVO_DELIVERY,
        self::MOTIVO_SERVICIOS,
        self::MOTIVO_PERSONAL,
        self::MOTIVO_CAMBIO,
        self::MOTIVO_OTROS,
    ];

    protected $table = 'fin_caja_egresos';

    protected $fillable = [
        'caja_sesion_id',
        'monto',
        'medio',
        'motivo',
        'notas',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<CajaSesion, $this> */
    public function sesion(): BelongsTo
    {
        return $this->belongsTo(CajaSesion::class, 'caja_sesion_id');
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

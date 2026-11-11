<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryIntegracion extends Model
{
    use HasUuids;

    public const PROVEEDOR_RAPPI = 'rappi';

    public const PROVEEDOR_PEDIDOSYA = 'pedidosya';

    public const PROVEEDORES = [
        self::PROVEEDOR_RAPPI,
        self::PROVEEDOR_PEDIDOSYA,
    ];

    protected $table = 'cfg_delivery_integraciones';

    protected $fillable = [
        'sede_id',
        'proveedor',
        'activo',
        'api_key',
        'api_secret',
        'store_id',
        'webhook_secret',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'meta' => 'array',
        ];
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryExternoLog extends Model
{
    use HasUuids;

    protected $table = 'log_delivery_externo';

    protected $fillable = [
        'sede_id',
        'proveedor',
        'external_id',
        'estado',
        'pedido_id',
        'payload',
        'error_mensaje',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'pedido_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryZona extends Model
{
    use HasUuids;

    protected $table = 'cfg_delivery_zonas';

    protected $fillable = [
        'sede_id',
        'nombre',
        'tarifa',
        'activa',
        'orden',
    ];

    protected function casts(): array
    {
        return [
            'tarifa' => 'decimal:2',
            'activa' => 'boolean',
            'orden' => 'integer',
        ];
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class, 'sede_id');
    }
}

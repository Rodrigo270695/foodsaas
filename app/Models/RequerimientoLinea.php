<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequerimientoLinea extends Model
{
    use HasUuids;

    protected $table = 'log_requerimiento_lineas';

    protected $fillable = [
        'requerimiento_id',
        'linea_tipo',
        'nombre',
        'insumo_id',
        'producto_id',
        'cantidad',
        'unidad',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:3',
        ];
    }

    public function requerimiento(): BelongsTo
    {
        return $this->belongsTo(RequerimientoAbastecimiento::class, 'requerimiento_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Oferta extends Model
{
    use HasUuids;

    public const TIPO_MONTO = 'monto';

    public const TIPO_PORCENTAJE = 'porcentaje';

    protected $table = 'mkt_ofertas';

    protected $fillable = [
        'sede_id',
        'codigo',
        'nombre',
        'tipo',
        'valor',
        'tope_monto',
        'usos_max',
        'usos_count',
        'vigente_desde',
        'vigente_hasta',
        'activa',
    ];

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:2',
            'tope_monto' => 'decimal:2',
            'usos_max' => 'integer',
            'usos_count' => 'integer',
            'vigente_desde' => 'date',
            'vigente_hasta' => 'date',
            'activa' => 'boolean',
        ];
    }

    public function isVigenteHoy(): bool
    {
        if (! $this->activa) {
            return false;
        }

        $hoy = now()->toDateString();

        if ($this->vigente_desde !== null && $hoy < $this->vigente_desde->toDateString()) {
            return false;
        }

        if ($this->vigente_hasta !== null && $hoy > $this->vigente_hasta->toDateString()) {
            return false;
        }

        if ($this->usos_max !== null && $this->usos_count >= $this->usos_max) {
            return false;
        }

        return true;
    }

    public function calcularDescuento(float $subtotal): float
    {
        $subtotal = max(0.0, round($subtotal, 2));
        if ($subtotal <= 0) {
            return 0.0;
        }

        $raw = $this->tipo === self::TIPO_PORCENTAJE
            ? $subtotal * ((float) $this->valor / 100)
            : (float) $this->valor;

        if ($this->tope_monto !== null) {
            $raw = min($raw, (float) $this->tope_monto);
        }

        return round(min(max(0.0, $raw), $subtotal), 2);
    }
}

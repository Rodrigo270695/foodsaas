<?php

declare(strict_types=1);

namespace App\Services\Crm;

use App\Models\Cliente;
use App\Models\CreditoMovimiento;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class ClienteCreditoService
{
    public function abonar(Cliente $cliente, float $monto, ?string $motivo = null): CreditoMovimiento
    {
        return $this->mover($cliente, CreditoMovimiento::TIPO_ABONO, abs($monto), $motivo);
    }

    public function cargar(Cliente $cliente, float $monto, ?string $motivo = null, ?string $refTipo = null, ?string $refId = null): CreditoMovimiento
    {
        $monto = abs($monto);
        $saldo = (float) $cliente->saldo_credito;
        if ($monto > $saldo + 0.0001) {
            throw ValidationException::withMessages([
                'pagos' => 'El cliente no tiene saldo de crédito suficiente (disponible: '.number_format($saldo, 2).').',
            ]);
        }

        return $this->mover(
            $cliente,
            CreditoMovimiento::TIPO_CARGO,
            $monto,
            $motivo,
            $refTipo,
            $refId,
        );
    }

    private function mover(
        Cliente $cliente,
        string $tipo,
        float $monto,
        ?string $motivo = null,
        ?string $refTipo = null,
        ?string $refId = null,
    ): CreditoMovimiento {
        $monto = round($monto, 2);
        if ($monto <= 0) {
            throw ValidationException::withMessages([
                'monto' => 'El monto debe ser mayor a cero.',
            ]);
        }

        return DB::transaction(function () use ($cliente, $tipo, $monto, $motivo, $refTipo, $refId) {
            /** @var Cliente $locked */
            $locked = Cliente::query()->whereKey($cliente->id)->lockForUpdate()->firstOrFail();
            $saldo = (float) $locked->saldo_credito;

            $delta = $tipo === CreditoMovimiento::TIPO_CARGO ? -$monto : $monto;
            if ($tipo === CreditoMovimiento::TIPO_AJUSTE) {
                $delta = $monto; // positivo = abono en ajuste
            }

            $nuevo = round($saldo + $delta, 2);
            if ($nuevo < -0.0001) {
                throw ValidationException::withMessages([
                    'pagos' => 'Saldo de crédito insuficiente.',
                ]);
            }

            $locked->saldo_credito = max(0, $nuevo);
            $locked->save();

            return CreditoMovimiento::query()->create([
                'cliente_id' => $locked->id,
                'tipo' => $tipo,
                'monto' => $monto,
                'saldo_resultante' => $locked->saldo_credito,
                'motivo' => $motivo !== null ? mb_substr(trim($motivo), 0, 255) : null,
                'referencia_tipo' => $refTipo,
                'referencia_id' => $refId,
                'user_id' => Auth::id(),
            ]);
        });
    }
}

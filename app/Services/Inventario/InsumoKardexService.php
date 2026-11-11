<?php

namespace App\Services\Inventario;

use App\Models\Insumo;
use App\Models\MovimientoInventario;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InsumoKardexService
{
    /**
     * @param  array{
     *     tipo: string,
     *     cantidad?: float|string|null,
     *     stock_nuevo?: float|string|null,
     *     motivo?: string|null,
     *     referencia_tipo?: string|null,
     *     referencia_id?: string|null,
     *     costo_unitario?: float|string|null
     * }  $data
     */
    public function registrar(Insumo $insumo, array $data): MovimientoInventario
    {
        $tipo = (string) ($data['tipo'] ?? '');
        if (! in_array($tipo, MovimientoInventario::TIPOS, true)) {
            throw ValidationException::withMessages([
                'tipo' => 'Tipo de movimiento no válido.',
            ]);
        }

        return DB::transaction(function () use ($insumo, $data, $tipo): MovimientoInventario {
            /** @var Insumo $locked */
            $locked = Insumo::query()->whereKey($insumo->id)->lockForUpdate()->firstOrFail();

            $anterior = (float) ($locked->stock ?? 0);
            $despues = $this->resolveStockDespues($tipo, $anterior, $data);
            $cantidad = round(abs($despues - $anterior), 3);

            if ($tipo !== MovimientoInventario::TIPO_AJUSTE && $cantidad <= 0) {
                throw ValidationException::withMessages([
                    'cantidad' => 'La cantidad debe ser mayor a cero.',
                ]);
            }

            $costoUnitario = array_key_exists('costo_unitario', $data) && $data['costo_unitario'] !== null && $data['costo_unitario'] !== ''
                ? round((float) $data['costo_unitario'], 4)
                : round((float) $locked->costo_unitario, 4);

            if ($tipo === MovimientoInventario::TIPO_ENTRADA
                && array_key_exists('costo_unitario', $data)
                && $data['costo_unitario'] !== null
                && $data['costo_unitario'] !== ''
            ) {
                $locked->costo_unitario = $costoUnitario;
            }

            $locked->stock = $despues;
            $locked->save();

            $costoTotal = null;
            if (in_array($tipo, [
                MovimientoInventario::TIPO_VENTA,
                MovimientoInventario::TIPO_SALIDA,
                MovimientoInventario::TIPO_MERMA,
            ], true)) {
                $costoTotal = round($cantidad * $costoUnitario, 4);
            }

            return MovimientoInventario::query()->create([
                'producto_id' => null,
                'insumo_id' => $locked->id,
                'tipo' => $tipo,
                'cantidad' => $cantidad,
                'stock_anterior' => $anterior,
                'stock_despues' => $despues,
                'costo_unitario' => $costoUnitario,
                'costo_total' => $costoTotal,
                'motivo' => isset($data['motivo']) && trim((string) $data['motivo']) !== ''
                    ? trim((string) $data['motivo'])
                    : null,
                'referencia_tipo' => $data['referencia_tipo'] ?? null,
                'referencia_id' => $data['referencia_id'] ?? null,
                'user_id' => Auth::id(),
            ]);
        });
    }

    /**
     * @param  array{cantidad?: float|string|null, stock_nuevo?: float|string|null}  $data
     */
    private function resolveStockDespues(string $tipo, float $anterior, array $data): float
    {
        if ($tipo === MovimientoInventario::TIPO_AJUSTE) {
            if (! array_key_exists('stock_nuevo', $data) || $data['stock_nuevo'] === null || $data['stock_nuevo'] === '') {
                throw ValidationException::withMessages([
                    'stock_nuevo' => 'Indica el stock resultante del ajuste.',
                ]);
            }

            $nuevo = (float) $data['stock_nuevo'];
            if ($nuevo < 0) {
                throw ValidationException::withMessages([
                    'stock_nuevo' => 'El stock no puede ser negativo.',
                ]);
            }

            return round($nuevo, 3);
        }

        $cantidad = (float) ($data['cantidad'] ?? 0);
        if ($cantidad <= 0) {
            throw ValidationException::withMessages([
                'cantidad' => 'La cantidad debe ser mayor a cero.',
            ]);
        }

        $cantidad = round(abs($cantidad), 3);

        $despues = match ($tipo) {
            MovimientoInventario::TIPO_ENTRADA => $anterior + $cantidad,
            MovimientoInventario::TIPO_SALIDA,
            MovimientoInventario::TIPO_MERMA,
            MovimientoInventario::TIPO_VENTA => $anterior - $cantidad,
            default => $anterior,
        };

        if ($despues < 0) {
            throw ValidationException::withMessages([
                'cantidad' => 'Stock de insumo insuficiente. Disponible: '.$anterior.'.',
            ]);
        }

        return round($despues, 3);
    }
}

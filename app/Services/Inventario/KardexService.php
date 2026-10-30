<?php

namespace App\Services\Inventario;

use App\Models\MovimientoInventario;
use App\Models\ProductoCarta;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class KardexService
{
    /**
     * @param  array{tipo: string, cantidad?: float|string|null, stock_nuevo?: float|string|null, motivo?: string|null, referencia_tipo?: string|null, referencia_id?: string|null}  $data
     */
    public function registrar(ProductoCarta $producto, array $data): MovimientoInventario
    {
        if ($producto->control_inventario !== ProductoCarta::CONTROL_SKU) {
            throw ValidationException::withMessages([
                'producto' => 'Solo productos con control de stock (SKU) admiten movimientos de kardex.',
            ]);
        }

        $tipo = (string) ($data['tipo'] ?? '');
        if (! in_array($tipo, MovimientoInventario::TIPOS, true)) {
            throw ValidationException::withMessages([
                'tipo' => 'Tipo de movimiento no válido.',
            ]);
        }

        return DB::transaction(function () use ($producto, $data, $tipo): MovimientoInventario {
            /** @var ProductoCarta $locked */
            $locked = ProductoCarta::query()->whereKey($producto->id)->lockForUpdate()->firstOrFail();

            $anterior = (float) ($locked->stock ?? 0);
            $despues = $this->resolveStockDespues($tipo, $anterior, $data);
            $cantidad = round(abs($despues - $anterior), 3);

            if ($tipo !== MovimientoInventario::TIPO_AJUSTE && $cantidad <= 0) {
                throw ValidationException::withMessages([
                    'cantidad' => 'La cantidad debe ser mayor a cero.',
                ]);
            }

            $locked->stock = $despues;
            $locked->save();

            return MovimientoInventario::query()->create([
                'producto_id' => $locked->id,
                'tipo' => $tipo,
                'cantidad' => $cantidad,
                'stock_anterior' => $anterior,
                'stock_despues' => $despues,
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
     * Stock inicial al crear/activar control SKU.
     */
    public function stockInicial(ProductoCarta $producto, float $stock, ?string $motivo = null): ?MovimientoInventario
    {
        if ($producto->control_inventario !== ProductoCarta::CONTROL_SKU) {
            return null;
        }

        $stock = round(max(0, $stock), 3);
        $producto->stock = $stock;
        $producto->save();

        if ($stock <= 0) {
            return null;
        }

        return MovimientoInventario::query()->create([
            'producto_id' => $producto->id,
            'tipo' => MovimientoInventario::TIPO_ENTRADA,
            'cantidad' => $stock,
            'stock_anterior' => 0,
            'stock_despues' => $stock,
            'motivo' => $motivo ?: 'Stock inicial',
            'referencia_tipo' => 'producto',
            'referencia_id' => $producto->id,
            'user_id' => Auth::id(),
        ]);
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
                'cantidad' => 'Stock insuficiente. Disponible: '.$anterior.'.',
            ]);
        }

        return round($despues, 3);
    }
}

<?php

namespace App\Services\Inventario;

use App\Models\MovimientoInventario;
use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Models\ProductoCarta;
use App\Models\Receta;
use App\Models\Venta;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecetaConsumoService
{
    public function __construct(
        private readonly InsumoKardexService $insumoKardex,
    ) {}

    /**
     * Baja insumos BOM por líneas recipe del pedido al cobrar.
     *
     * @param  iterable<int, PedidoLinea>  $lineasCobrables
     */
    public function consumirPorVenta(
        Pedido $pedido,
        Venta $venta,
        iterable $lineasCobrables,
    ): void {
        DB::transaction(function () use ($pedido, $venta, $lineasCobrables): void {
            foreach ($lineasCobrables as $linea) {
                $this->consumirLinea($linea, $venta, (int) $pedido->numero);
            }
        });
    }

    public function revertirPorVenta(Venta $venta): void
    {
        $movimientos = MovimientoInventario::query()
            ->where('referencia_tipo', 'venta')
            ->where('referencia_id', $venta->id)
            ->where('tipo', MovimientoInventario::TIPO_VENTA)
            ->whereNotNull('insumo_id')
            ->orderBy('created_at')
            ->get();

        foreach ($movimientos as $mov) {
            $insumo = $mov->insumo;
            if ($insumo === null) {
                continue;
            }

            $cantidad = (float) $mov->cantidad;
            if ($cantidad <= 0) {
                continue;
            }

            $this->insumoKardex->registrar($insumo, [
                'tipo' => MovimientoInventario::TIPO_ENTRADA,
                'cantidad' => $cantidad,
                'motivo' => 'Anulación venta '.($venta->numero ?? $venta->id),
                'referencia_tipo' => 'venta_anulacion',
                'referencia_id' => $venta->id,
                'costo_unitario' => $mov->costo_unitario,
            ]);
        }
    }

    private function consumirLinea(PedidoLinea $linea, Venta $venta, int $numeroPedido): void
    {
        if ($linea->producto_id === null) {
            return;
        }

        $producto = ProductoCarta::query()
            ->with(['receta.lineas.insumo'])
            ->find($linea->producto_id);

        if ($producto === null || ! $producto->tracksRecipeStock()) {
            return;
        }

        /** @var Receta|null $receta */
        $receta = $producto->receta;
        if ($receta === null || $receta->lineas->isEmpty()) {
            throw ValidationException::withMessages([
                'receta' => 'El producto «'.$producto->nombre.'» no tiene receta BOM configurada.',
            ]);
        }

        $porciones = (float) $linea->cantidad;
        if ($porciones <= 0) {
            return;
        }

        foreach ($receta->lineas as $bomLinea) {
            $insumo = $bomLinea->insumo;
            if ($insumo === null || ! $insumo->activo) {
                throw ValidationException::withMessages([
                    'receta' => 'La receta de «'.$producto->nombre.'» tiene un insumo inválido.',
                ]);
            }

            $qty = round((float) $bomLinea->cantidad * $porciones, 3);
            if ($qty <= 0) {
                continue;
            }

            $this->insumoKardex->registrar($insumo, [
                'tipo' => MovimientoInventario::TIPO_VENTA,
                'cantidad' => $qty,
                'motivo' => 'Venta pedido #'.$numeroPedido.' · '.$producto->nombre,
                'referencia_tipo' => 'venta',
                'referencia_id' => $venta->id,
                'costo_unitario' => (float) $insumo->costo_unitario,
            ]);
        }
    }
}

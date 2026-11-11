<?php

namespace App\Services\Inventario;

use App\Models\Compra;
use App\Models\CompraLinea;
use App\Models\MovimientoInventario;
use App\Models\ProductoCarta;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompraRecepcionService
{
    public function __construct(
        private readonly InsumoKardexService $insumoKardex,
        private readonly KardexService $kardex,
    ) {}

    /**
     * @param  list<array{linea_id: string, cantidad: float|int|string}>  $items
     */
    public function recibir(Compra $compra, array $items): Compra
    {
        if (! $compra->canRecibir()) {
            throw ValidationException::withMessages([
                'compra' => 'Solo se pueden recibir órdenes enviadas o parciales.',
            ]);
        }

        if ($items === []) {
            throw ValidationException::withMessages([
                'lineas' => 'Indica al menos una cantidad a recibir.',
            ]);
        }

        return DB::transaction(function () use ($compra, $items): Compra {
            /** @var Compra $locked */
            $locked = Compra::query()
                ->whereKey($compra->id)
                ->lockForUpdate()
                ->with(['lineas.insumo', 'lineas.producto'])
                ->firstOrFail();

            if (! $locked->canRecibir()) {
                throw ValidationException::withMessages([
                    'compra' => 'Solo se pueden recibir órdenes enviadas o parciales.',
                ]);
            }

            $byId = [];
            foreach ($items as $item) {
                $lineaId = (string) ($item['linea_id'] ?? '');
                $qty = round((float) ($item['cantidad'] ?? 0), 3);
                if ($lineaId === '' || $qty <= 0) {
                    continue;
                }
                $byId[$lineaId] = ($byId[$lineaId] ?? 0) + $qty;
            }

            if ($byId === []) {
                throw ValidationException::withMessages([
                    'lineas' => 'Indica al menos una cantidad a recibir.',
                ]);
            }

            $lineas = $locked->lineas->keyBy('id');
            $motivo = 'Recepción OC #'.$locked->numero;

            foreach ($byId as $lineaId => $qty) {
                /** @var CompraLinea|null $linea */
                $linea = $lineas->get($lineaId);
                if ($linea === null) {
                    throw ValidationException::withMessages([
                        'lineas' => 'Una o más líneas no pertenecen a esta compra.',
                    ]);
                }

                $pendiente = $linea->pendiente();
                if ($qty > $pendiente) {
                    throw ValidationException::withMessages([
                        'lineas' => 'La cantidad a recibir supera lo pendiente en una línea (máx. '.$pendiente.').',
                    ]);
                }

                $costo = (float) $linea->costo_unitario;

                if ($linea->linea_tipo === CompraLinea::TIPO_INSUMO) {
                    $insumo = $linea->insumo;
                    if ($insumo === null || ! $insumo->activo) {
                        throw ValidationException::withMessages([
                            'lineas' => 'Insumo inválido o inactivo en la OC.',
                        ]);
                    }

                    $this->insumoKardex->registrar($insumo, [
                        'tipo' => MovimientoInventario::TIPO_ENTRADA,
                        'cantidad' => $qty,
                        'motivo' => $motivo,
                        'referencia_tipo' => 'compra',
                        'referencia_id' => $locked->id,
                        'costo_unitario' => $costo,
                    ]);
                } else {
                    $producto = $linea->producto;
                    if ($producto === null || ! $producto->tracksSkuStock()) {
                        throw ValidationException::withMessages([
                            'lineas' => 'Producto SKU inválido en la OC.',
                        ]);
                    }

                    $this->kardex->registrar($producto, [
                        'tipo' => MovimientoInventario::TIPO_ENTRADA,
                        'cantidad' => $qty,
                        'motivo' => $motivo,
                        'referencia_tipo' => 'compra',
                        'referencia_id' => $locked->id,
                        'costo_unitario' => $costo,
                    ]);
                }

                $linea->cantidad_recibida = round((float) $linea->cantidad_recibida + $qty, 3);
                $linea->save();
            }

            $locked->load('lineas');
            $locked->estado = $this->resolveEstado($locked);
            $locked->total = $this->computeTotal($locked);
            $locked->save();

            return $locked->fresh(['lineas.insumo', 'lineas.producto', 'proveedor']);
        });
    }

    public function resolveEstado(Compra $compra): string
    {
        $lineas = $compra->lineas;
        if ($lineas->isEmpty()) {
            return Compra::ESTADO_ENVIADA;
        }

        $allDone = $lineas->every(
            fn (CompraLinea $l) => (float) $l->cantidad_recibida >= (float) $l->cantidad,
        );
        if ($allDone) {
            return Compra::ESTADO_RECIBIDA;
        }

        $any = $lineas->contains(
            fn (CompraLinea $l) => (float) $l->cantidad_recibida > 0,
        );

        return $any ? Compra::ESTADO_PARCIAL : Compra::ESTADO_ENVIADA;
    }

    public function computeTotal(Compra $compra): float
    {
        $total = 0.0;
        foreach ($compra->lineas as $linea) {
            $total += (float) $linea->cantidad * (float) $linea->costo_unitario;
        }

        return round($total, 2);
    }
}

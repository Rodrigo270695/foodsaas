<?php

namespace App\Services\Operacion;

use App\Models\CajaEgreso;
use App\Models\CajaSesion;
use App\Models\MovimientoInventario;
use App\Models\Pago;
use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Models\ProductoCarta;
use App\Models\Venta;
use App\Services\Inventario\KardexService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CajaService
{
    public function __construct(
        private readonly KardexService $kardex,
        private readonly PedidoService $pedidos,
    ) {}

    public function sesionAbierta(string $sedeId): ?CajaSesion
    {
        return CajaSesion::query()
            ->where('sede_id', $sedeId)
            ->where('estado', CajaSesion::ESTADO_ABIERTA)
            ->latest('opened_at')
            ->first();
    }

    public function abrirSesion(string $sedeId, float $montoApertura = 0): CajaSesion
    {
        if ($this->sesionAbierta($sedeId) !== null) {
            throw ValidationException::withMessages([
                'caja' => 'Ya hay una sesión de caja abierta en esta sede.',
            ]);
        }

        return CajaSesion::query()->create([
            'sede_id' => $sedeId,
            'estado' => CajaSesion::ESTADO_ABIERTA,
            'monto_apertura' => round(max(0, $montoApertura), 2),
            'opened_by' => Auth::id(),
            'opened_at' => now(),
        ]);
    }

    public function cerrarSesion(CajaSesion $sesion, float $montoContado, ?string $notas = null): CajaSesion
    {
        if (! $sesion->isAbierta()) {
            throw ValidationException::withMessages([
                'caja' => 'La sesión de caja ya está cerrada.',
            ]);
        }

        $efectivoVentas = (float) Pago::query()
            ->whereHas('venta', function ($q) use ($sesion): void {
                $q->where('caja_sesion_id', $sesion->id)
                    ->where('estado', Venta::ESTADO_PAGADA);
            })
            ->where('medio', Pago::MEDIO_EFECTIVO)
            ->sum('monto');

        $efectivoEgresos = (float) CajaEgreso::query()
            ->where('caja_sesion_id', $sesion->id)
            ->where('medio', Pago::MEDIO_EFECTIVO)
            ->sum('monto');

        $sistema = round((float) $sesion->monto_apertura + $efectivoVentas - $efectivoEgresos, 2);

        $sesion->forceFill([
            'estado' => CajaSesion::ESTADO_CERRADA,
            'monto_cierre_sistema' => $sistema,
            'monto_cierre_contado' => round(max(0, $montoContado), 2),
            'notas_cierre' => $notas !== null && trim($notas) !== '' ? trim($notas) : null,
            'closed_by' => Auth::id(),
            'closed_at' => now(),
        ])->save();

        return $sesion;
    }

    /**
     * @param  list<array{medio: string, monto: float|string, referencia?: string|null}>  $pagos
     */
    public function cobrarPedido(Pedido $pedido, array $pagos, ?float $descuento = null): Venta
    {
        if (! $pedido->isActivo()) {
            throw ValidationException::withMessages([
                'pedido' => 'El pedido no está activo.',
            ]);
        }

        $pendientes = $pedido->lineas()
            ->where('estado', PedidoLinea::ESTADO_PENDIENTE)
            ->exists();

        if ($pendientes) {
            throw ValidationException::withMessages([
                'pedido' => 'Hay ítems sin enviar a cocina. Envíalos o anúlalos antes de cobrar.',
            ]);
        }

        $lineasCobrables = $pedido->lineas()
            ->whereIn('estado', [PedidoLinea::ESTADO_EN_COLA, PedidoLinea::ESTADO_LISTO])
            ->get();

        if ($lineasCobrables->isEmpty()) {
            throw ValidationException::withMessages([
                'pedido' => 'El pedido no tiene ítems para cobrar.',
            ]);
        }

        $sesion = $this->sesionAbierta((string) $pedido->sede_id);
        if ($sesion === null) {
            throw ValidationException::withMessages([
                'caja' => 'Abre la caja antes de cobrar.',
            ]);
        }

        return DB::transaction(function () use ($pedido, $pagos, $descuento, $sesion, $lineasCobrables): Venta {
            /** @var Pedido $locked */
            $locked = Pedido::query()->whereKey($pedido->id)->lockForUpdate()->firstOrFail();

            if (! $locked->isActivo()) {
                throw ValidationException::withMessages([
                    'pedido' => 'El pedido ya no está activo.',
                ]);
            }

            if ($descuento !== null) {
                $locked->descuento = round(max(0, $descuento), 2);
            }
            $this->pedidos->recalcularTotales($locked);
            $locked->refresh();

            $total = round((float) $locked->total, 2);
            $sumaPagos = round(collect($pagos)->sum(fn ($p) => (float) ($p['monto'] ?? 0)), 2);

            if ($sumaPagos < $total) {
                throw ValidationException::withMessages([
                    'pagos' => 'El monto pagado ('.$sumaPagos.') es menor al total ('.$total.').',
                ]);
            }

            if ($pagos === []) {
                throw ValidationException::withMessages([
                    'pagos' => 'Registra al menos un pago.',
                ]);
            }

            foreach ($pagos as $i => $pago) {
                $medio = (string) ($pago['medio'] ?? '');
                if (! in_array($medio, Pago::MEDIOS, true)) {
                    throw ValidationException::withMessages([
                        "pagos.{$i}.medio" => 'Medio de pago no válido.',
                    ]);
                }
                if ((float) ($pago['monto'] ?? 0) <= 0) {
                    throw ValidationException::withMessages([
                        "pagos.{$i}.monto" => 'El monto debe ser mayor a cero.',
                    ]);
                }
            }

            $venta = Venta::query()->create([
                'sede_id' => $locked->sede_id,
                'pedido_id' => $locked->id,
                'caja_sesion_id' => $sesion->id,
                'estado' => Venta::ESTADO_PAGADA,
                'subtotal' => $locked->subtotal,
                'descuento' => $locked->descuento,
                'total' => $locked->total,
                'created_by' => Auth::id(),
            ]);

            $restante = $total;
            foreach ($pagos as $pago) {
                $monto = round((float) $pago['monto'], 2);
                // El vuelto en efectivo no se registra como ingreso extra:
                // si un solo pago en efectivo supera el total, capamos al total.
                if (count($pagos) === 1 && ($pago['medio'] ?? '') === Pago::MEDIO_EFECTIVO && $monto > $total) {
                    $monto = $total;
                } elseif ($monto > $restante && count($pagos) > 1) {
                    $monto = $restante;
                }

                if ($monto <= 0) {
                    continue;
                }

                Pago::query()->create([
                    'venta_id' => $venta->id,
                    'medio' => (string) $pago['medio'],
                    'monto' => $monto,
                    'referencia' => isset($pago['referencia']) && trim((string) $pago['referencia']) !== ''
                        ? trim((string) $pago['referencia'])
                        : null,
                ]);
                $restante = round($restante - $monto, 2);
            }

            foreach ($lineasCobrables as $linea) {
                $this->descontarStockLinea($linea, $venta, (int) $locked->numero);
                if ($linea->estado === PedidoLinea::ESTADO_EN_COLA) {
                    $linea->estado = PedidoLinea::ESTADO_LISTO;
                    $linea->listo_at = $linea->listo_at ?? now();
                    $linea->save();
                }
            }

            $locked->estado = Pedido::ESTADO_CERRADO;
            $locked->cerrado_at = now();
            $locked->save();

            return $venta->load('pagos');
        });
    }

    /**
     * @param  array{monto: float|string, medio?: string, motivo: string, notas?: string|null}  $data
     */
    public function registrarEgreso(CajaSesion $sesion, array $data): CajaEgreso
    {
        if (! $sesion->isAbierta()) {
            throw ValidationException::withMessages([
                'caja' => 'La sesión de caja ya está cerrada.',
            ]);
        }

        $motivo = (string) ($data['motivo'] ?? '');
        if (! in_array($motivo, CajaEgreso::MOTIVOS, true)) {
            throw ValidationException::withMessages([
                'motivo' => 'Motivo de egreso no válido.',
            ]);
        }

        $medio = (string) ($data['medio'] ?? Pago::MEDIO_EFECTIVO);
        if (! in_array($medio, Pago::MEDIOS, true)) {
            throw ValidationException::withMessages([
                'medio' => 'Medio no válido.',
            ]);
        }

        $monto = round((float) ($data['monto'] ?? 0), 2);
        if ($monto <= 0) {
            throw ValidationException::withMessages([
                'monto' => 'El monto debe ser mayor a cero.',
            ]);
        }

        $notas = isset($data['notas']) && is_string($data['notas']) && trim($data['notas']) !== ''
            ? trim($data['notas'])
            : null;

        return CajaEgreso::query()->create([
            'caja_sesion_id' => $sesion->id,
            'monto' => $monto,
            'medio' => $medio,
            'motivo' => $motivo,
            'notas' => $notas,
            'created_by' => Auth::id(),
        ]);
    }

    private function descontarStockLinea(PedidoLinea $linea, Venta $venta, int $numeroPedido): void
    {
        if ($linea->producto_id === null) {
            return;
        }

        $producto = ProductoCarta::query()->find($linea->producto_id);
        if ($producto === null || ! $producto->tracksSkuStock()) {
            return;
        }

        $this->kardex->registrar($producto, [
            'tipo' => MovimientoInventario::TIPO_VENTA,
            'cantidad' => (float) $linea->cantidad,
            'motivo' => 'Venta pedido #'.$numeroPedido,
            'referencia_tipo' => 'venta',
            'referencia_id' => $venta->id,
        ]);
    }
}

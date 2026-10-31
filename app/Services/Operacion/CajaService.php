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
use App\Support\Caja\CajaBilleteras;
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

    public function sesionAbiertaDelUsuario(?int $userId = null): ?CajaSesion
    {
        $userId ??= Auth::id() !== null ? (int) Auth::id() : null;
        if ($userId === null) {
            return null;
        }

        return CajaSesion::query()
            ->where('opened_by', $userId)
            ->where('estado', CajaSesion::ESTADO_ABIERTA)
            ->latest('opened_at')
            ->first();
    }

    /**
     * @param  array{
     *     monto_apertura?: float|int|string|null,
     *     saldos_apertura?: array<string, mixed>|null,
     *     moneda?: string|null,
     *     notas?: string|null
     * }  $data
     */
    public function abrirSesion(string $sedeId, array $data = []): CajaSesion
    {
        return DB::transaction(function () use ($sedeId, $data): CajaSesion {
            $userId = Auth::id();

            // Una abierta por sede: otro cajero no abre encima.
            $enSede = CajaSesion::query()
                ->where('sede_id', $sedeId)
                ->where('estado', CajaSesion::ESTADO_ABIERTA)
                ->lockForUpdate()
                ->first();

            if ($enSede !== null) {
                throw ValidationException::withMessages([
                    'caja' => 'Ya hay una sesión de caja abierta en esta sede. Solo quien la abrió puede cerrarla.',
                ]);
            }

            // Una abierta por cajero: no abras otra sede mientras tengas la tuya.
            if ($userId !== null) {
                $mia = CajaSesion::query()
                    ->where('opened_by', $userId)
                    ->where('estado', CajaSesion::ESTADO_ABIERTA)
                    ->lockForUpdate()
                    ->first();

                if ($mia !== null) {
                    throw ValidationException::withMessages([
                        'caja' => 'Ya tienes una sesión de caja abierta. Ciérrala antes de abrir otra (otra sede u otro turno).',
                    ]);
                }
            }

            $moneda = strtoupper(trim((string) ($data['moneda'] ?? 'PEN')));
            if (! in_array($moneda, ['PEN', 'USD'], true)) {
                $moneda = 'PEN';
            }

            $notas = isset($data['notas']) && is_string($data['notas']) && trim($data['notas']) !== ''
                ? trim($data['notas'])
                : null;

            return CajaSesion::query()->create([
                'sede_id' => $sedeId,
                'estado' => CajaSesion::ESTADO_ABIERTA,
                'moneda' => $moneda,
                'monto_apertura' => round(max(0, (float) ($data['monto_apertura'] ?? 0)), 2),
                'saldos_apertura_json' => CajaBilleteras::normalize($data['saldos_apertura'] ?? null),
                'notas_apertura' => $notas,
                'opened_by' => $userId,
                'opened_at' => now(),
            ]);
        });
    }

    /**
     * @param  array{
     *     monto_contado?: float|int|string|null,
     *     saldo_cierre_efectivo?: float|int|string|null,
     *     saldos_cierre?: array<string, mixed>|null,
     *     notas?: string|null
     * }  $data
     */
    public function cerrarSesion(CajaSesion $sesion, array $data): CajaSesion
    {
        if (! $sesion->isAbierta()) {
            throw ValidationException::withMessages([
                'caja' => 'La sesión de caja ya está cerrada.',
            ]);
        }

        if ((string) $sesion->opened_by !== (string) Auth::id()) {
            throw ValidationException::withMessages([
                'caja' => 'Solo quien abrió la sesión puede cerrarla.',
            ]);
        }

        $montoContado = (float) ($data['saldo_cierre_efectivo'] ?? $data['monto_contado'] ?? 0);
        $saldosCierre = CajaBilleteras::normalize($data['saldos_cierre'] ?? null);

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

        $arqueo = app(CajaSesionArqueoService::class)->build(
            $sesion,
            number_format(max(0, $montoContado), 2, '.', ''),
            $saldosCierre,
        );

        $sesion->forceFill([
            'estado' => CajaSesion::ESTADO_CERRADA,
            'monto_cierre_sistema' => $sistema,
            'monto_cierre_contado' => round(max(0, $montoContado), 2),
            'saldos_cierre_json' => $saldosCierre,
            'arqueo_json' => $arqueo,
            'notas_cierre' => isset($data['notas']) && is_string($data['notas']) && trim($data['notas']) !== ''
                ? trim($data['notas'])
                : null,
            'closed_by' => Auth::id(),
            'closed_at' => now(),
        ])->save();

        return $sesion;
    }

    /**
     * Reabre una sesión cerrada hace menos de CajaSesion::REABRIR_HORAS,
     * siempre que la sede no tenga otra sesión abierta.
     */
    public function reabrirSesion(CajaSesion $sesion): CajaSesion
    {
        if ($sesion->isAbierta()) {
            throw ValidationException::withMessages([
                'caja' => 'La sesión ya está abierta.',
            ]);
        }

        if (! $sesion->estaDentroDeVentanaReabrir()) {
            throw ValidationException::withMessages([
                'caja' => 'Ya pasaron más de 24 horas desde el cierre; no se puede reabrir.',
            ]);
        }

        return DB::transaction(function () use ($sesion): CajaSesion {
            /** @var CajaSesion $locked */
            $locked = CajaSesion::query()->whereKey($sesion->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->isAbierta()) {
                throw ValidationException::withMessages([
                    'caja' => 'La sesión ya está abierta.',
                ]);
            }

            if (! $locked->estaDentroDeVentanaReabrir()) {
                throw ValidationException::withMessages([
                    'caja' => 'Ya pasaron más de 24 horas desde el cierre; no se puede reabrir.',
                ]);
            }

            $otraAbiertaSede = CajaSesion::query()
                ->where('sede_id', $locked->sede_id)
                ->where('estado', CajaSesion::ESTADO_ABIERTA)
                ->whereKeyNot($locked->getKey())
                ->lockForUpdate()
                ->exists();

            if ($otraAbiertaSede) {
                throw ValidationException::withMessages([
                    'caja' => 'Ya hay una sesión de caja abierta en esta sede.',
                ]);
            }

            if ($locked->opened_by !== null) {
                $cajeroOcupado = CajaSesion::query()
                    ->where('opened_by', $locked->opened_by)
                    ->where('estado', CajaSesion::ESTADO_ABIERTA)
                    ->whereKeyNot($locked->getKey())
                    ->lockForUpdate()
                    ->exists();

                if ($cajeroOcupado) {
                    throw ValidationException::withMessages([
                        'caja' => 'Quien abrió esta sesión ya tiene otra caja abierta.',
                    ]);
                }
            }

            $locked->forceFill([
                'estado' => CajaSesion::ESTADO_ABIERTA,
                'monto_cierre_sistema' => null,
                'monto_cierre_contado' => null,
                'saldos_cierre_json' => null,
                'arqueo_json' => null,
                'closed_by' => null,
                'closed_at' => null,
            ])->save();

            return $locked;
        });
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

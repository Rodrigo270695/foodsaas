<?php

declare(strict_types=1);

namespace App\Services\Operacion;

use App\Models\CajaEgreso;
use App\Models\CajaSesion;
use App\Models\Pago;
use App\Models\Sede;
use App\Models\Venta;
use App\Support\Caja\CajaBilleteras;
use Illuminate\Support\Collection;

/**
 * Calcula el arqueo de una sesión de caja: ventas, egresos, métodos de pago
 * y billeteras digitales (Yape, Plin, transferencia, Agora, Sip).
 */
final class CajaSesionArqueoService
{
    /**
     * @param  array<string, string>|null  $billeterasContadas
     * @return array<string, mixed>
     */
    public function build(CajaSesion $sesion, ?string $efectivoContado = null, ?array $billeterasContadas = null): array
    {
        $ventas = Venta::query()
            ->with(['pagos', 'pedido:id,numero,mesa_id,canal', 'pedido.mesa:id,nombre,codigo'])
            ->where('caja_sesion_id', $sesion->getKey())
            ->orderBy('created_at')
            ->get(['id', 'pedido_id', 'estado', 'total', 'created_at']);

        $vigentes = $ventas->filter(static fn (Venta $v): bool => $v->estado === Venta::ESTADO_PAGADA);
        $anuladas = $ventas->filter(static fn (Venta $v): bool => $v->estado === Venta::ESTADO_ANULADA);

        $metodos = $this->agruparMetodos($vigentes);
        $ventasTotal = $this->money((string) $vigentes->sum('total'));
        $metodosChart = $this->chartMetodos($metodos, $ventasTotal);
        $ventasDetalle = $this->detalleVentas($vigentes);

        $egresos = CajaEgreso::query()
            ->with(['createdBy:id,name'])
            ->where('caja_sesion_id', $sesion->getKey())
            ->orderBy('created_at')
            ->get();

        $egresosTotal = '0.00';
        $egresosEfectivo = '0.00';
        $egresosPorBilletera = array_fill_keys(CajaBilleteras::CODIGOS, '0.00');
        $egresosDetalle = [];
        foreach ($egresos as $egreso) {
            $monto = $this->money((string) $egreso->monto);
            $medio = in_array($egreso->medio, Pago::MEDIOS, true) ? $egreso->medio : Pago::MEDIO_EFECTIVO;
            $egresosTotal = $this->add($egresosTotal, $monto);
            if ($medio === Pago::MEDIO_EFECTIVO) {
                $egresosEfectivo = $this->add($egresosEfectivo, $monto);
            } elseif (isset($egresosPorBilletera[$medio])) {
                $egresosPorBilletera[$medio] = $this->add($egresosPorBilletera[$medio], $monto);
            }
            $egresosDetalle[] = [
                'id' => (string) $egreso->getKey(),
                'monto' => $monto,
                'medio' => $medio,
                'medio_label' => $this->medioLabel($medio),
                'motivo' => (string) $egreso->motivo,
                'motivo_label' => $this->motivoLabel((string) $egreso->motivo),
                'notas' => $egreso->notas,
                'created_at' => $egreso->created_at?->toIso8601String(),
                'created_by' => $egreso->createdBy?->name,
            ];
        }

        $anuladasTotal = $this->money((string) $anuladas->sum('total'));

        $efectivoVentas = $this->sumMetodo($metodos, Pago::MEDIO_EFECTIVO);
        $noEfectivoTotal = $this->sub($ventasTotal, $efectivoVentas);
        $saldoApertura = $this->money((string) $sesion->monto_apertura);
        // Efectivo esperado = caja física (apertura + ventas en efectivo − egresos en efectivo).
        $esperado = $this->sub($this->add($saldoApertura, $efectivoVentas), $egresosEfectivo);

        $contado = null;
        $diferencia = null;
        if ($efectivoContado !== null && $efectivoContado !== '') {
            $contado = $this->money($efectivoContado);
            $diferencia = $this->sub($contado, $esperado);
        } elseif ($sesion->monto_cierre_contado !== null) {
            $contado = $this->money((string) $sesion->monto_cierre_contado);
            $diferencia = $this->sub($contado, $esperado);
        }

        $sedeNombre = Sede::query()->whereKey($sesion->sede_id)->value('nombre');

        return [
            'sesion_id' => (string) $sesion->getKey(),
            'sede_id' => (string) $sesion->sede_id,
            'sede_nombre' => $sedeNombre ? (string) $sedeNombre : '—',
            'moneda' => (string) $sesion->moneda,
            'estado' => (string) $sesion->estado,
            'opened_at' => $sesion->opened_at?->toIso8601String(),
            'closed_at' => $sesion->closed_at?->toIso8601String(),
            'ventas_count' => $vigentes->count(),
            'ventas_total' => $ventasTotal,
            // FoodSaaS no distingue productos/servicios: todo el cobro es "productos".
            'productos_total' => $ventasTotal,
            'servicios_total' => '0.00',
            'no_efectivo_total' => $noEfectivoTotal,
            'anuladas_count' => $anuladas->count(),
            'anuladas_total' => $anuladasTotal,
            // Sin tipos de comprobante SUNAT por venta aún: todo cuenta como ticket.
            'comprobantes' => [
                'tickets' => ['count' => $vigentes->count(), 'total' => $ventasTotal],
                'boletas' => ['count' => 0, 'total' => '0.00'],
                'facturas' => ['count' => 0, 'total' => '0.00'],
            ],
            'metodos' => $metodos,
            'metodos_chart' => $metodosChart,
            'ventas' => $ventasDetalle,
            'egresos_count' => $egresos->count(),
            'egresos_total' => $egresosTotal,
            'egresos_efectivo' => $egresosEfectivo,
            'egresos' => $egresosDetalle,
            'saldo_apertura' => $saldoApertura,
            'efectivo_ventas' => $efectivoVentas,
            'efectivo_esperado' => $esperado,
            'efectivo_contado' => $contado,
            'diferencia' => $diferencia,
            'billeteras' => $this->billeteras($sesion, $metodos, $billeterasContadas, $egresosPorBilletera),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Esperado por billetera = apertura de ese canal + cobros − egresos de ese canal.
     *
     * @param  list<array{codigo: string, count: int, total: string}>  $metodos
     * @param  array<string, string>|null  $billeterasContadas
     * @param  array<string, string>  $egresosPorBilletera
     * @return list<array{
     *     codigo: string,
     *     apertura: string,
     *     ventas: string,
     *     egresos: string,
     *     esperado: string,
     *     contado: string|null,
     *     diferencia: string|null
     * }>
     */
    private function billeteras(
        CajaSesion $sesion,
        array $metodos,
        ?array $billeterasContadas,
        array $egresosPorBilletera,
    ): array {
        $aperturaMap = CajaBilleteras::normalize(
            is_array($sesion->saldos_apertura_json) ? $sesion->saldos_apertura_json : null,
        );

        $cierreMap = is_array($sesion->saldos_cierre_json) && $sesion->saldos_cierre_json !== []
            ? CajaBilleteras::normalize($sesion->saldos_cierre_json)
            : null;

        $rows = [];
        foreach (CajaBilleteras::CODIGOS as $codigo) {
            $apertura = $aperturaMap[$codigo];
            $ventas = $this->sumMetodo($metodos, $codigo);
            $egresosCanal = $this->money((string) ($egresosPorBilletera[$codigo] ?? '0.00'));
            $esperado = $this->sub($this->add($apertura, $ventas), $egresosCanal);

            $contado = null;
            if (is_array($billeterasContadas) && array_key_exists($codigo, $billeterasContadas)) {
                $contado = $this->money((string) $billeterasContadas[$codigo]);
            } elseif ($cierreMap !== null) {
                $contado = $cierreMap[$codigo];
            }

            $diferencia = $contado !== null ? $this->sub($contado, $esperado) : null;

            $rows[] = [
                'codigo' => $codigo,
                'apertura' => $apertura,
                'ventas' => $ventas,
                'egresos' => $egresosCanal,
                'esperado' => $esperado,
                'contado' => $contado,
                'diferencia' => $diferencia,
            ];
        }

        return $rows;
    }

    /**
     * @param  Collection<int, Venta>  $ventas
     * @return list<array{codigo: string, count: int, total: string}>
     */
    private function agruparMetodos(Collection $ventas): array
    {
        $buckets = [];
        foreach (Pago::MEDIOS as $codigo) {
            $buckets[$codigo] = ['codigo' => $codigo, 'count' => 0, 'total' => '0.00'];
        }

        foreach ($ventas as $venta) {
            $pagos = $venta->relationLoaded('pagos') ? $venta->pagos : collect();
            $metodosEnVenta = [];
            foreach ($pagos as $pago) {
                $codigo = isset($buckets[$pago->medio]) ? $pago->medio : Pago::MEDIO_OTRO;
                $buckets[$codigo]['total'] = $this->add(
                    $buckets[$codigo]['total'],
                    $this->money((string) $pago->monto),
                );
                $metodosEnVenta[$codigo] = true;
            }
            foreach (array_keys($metodosEnVenta) as $codigo) {
                $buckets[$codigo]['count']++;
            }
        }

        return array_values(array_filter(
            $buckets,
            static fn (array $row): bool => $row['count'] > 0 || $row['codigo'] === Pago::MEDIO_EFECTIVO,
        ));
    }

    /**
     * @param  list<array{codigo: string, count: int, total: string}>  $metodos
     * @return list<array{codigo: string, count: int, total: string, pct: float, bar_pct: float}>
     */
    private function chartMetodos(array $metodos, string $ventasTotal): array
    {
        $total = (float) $ventasTotal;
        $out = [];

        foreach ($metodos as $row) {
            if ((int) $row['count'] <= 0) {
                continue;
            }

            $monto = (float) $row['total'];
            $pct = $total > 0 ? round(($monto / $total) * 100, 1) : 0.0;

            $out[] = [
                'codigo' => $row['codigo'],
                'count' => (int) $row['count'],
                'total' => $this->money($row['total']),
                'pct' => $pct,
                'bar_pct' => max(2.0, min(100.0, $pct)),
            ];
        }

        return $out;
    }

    /**
     * @param  Collection<int, Venta>  $ventas
     * @return list<array{
     *     id: string,
     *     numero: string,
     *     fecha: string|null,
     *     mesa: string|null,
     *     canal: string|null,
     *     pagos: list<array{medio: string, monto: string}>,
     *     comprobante: string,
     *     total: string,
     *     estado: string
     * }>
     */
    private function detalleVentas(Collection $ventas): array
    {
        $tz = (string) config('app.timezone', 'UTC');
        $rows = [];

        foreach ($ventas as $venta) {
            $pedido = $venta->pedido;
            $mesa = $pedido?->mesa;

            $pagosRow = [];
            if ($venta->relationLoaded('pagos')) {
                foreach ($venta->pagos as $pago) {
                    $pagosRow[] = [
                        'medio' => (string) $pago->medio,
                        'monto' => $this->money((string) $pago->monto),
                    ];
                }
            }

            $rows[] = [
                'id' => (string) $venta->getKey(),
                'numero' => $pedido?->numero ? '#'.$pedido->numero : '—',
                'fecha' => $venta->created_at?->timezone($tz)->toIso8601String(),
                'mesa' => $mesa?->nombre ?: $mesa?->codigo,
                'canal' => $pedido?->canal,
                'pagos' => $pagosRow,
                'comprobante' => 'ticket',
                'total' => $this->money((string) $venta->total),
                'estado' => (string) $venta->estado,
            ];
        }

        return $rows;
    }

    /**
     * @param  list<array{codigo: string, count: int, total: string}>  $metodos
     */
    private function sumMetodo(array $metodos, string $codigo): string
    {
        foreach ($metodos as $row) {
            if ($row['codigo'] === $codigo) {
                return $this->money($row['total']);
            }
        }

        return '0.00';
    }

    private function medioLabel(string $medio): string
    {
        return match ($medio) {
            Pago::MEDIO_EFECTIVO => 'Efectivo',
            Pago::MEDIO_TARJETA => 'Tarjeta',
            Pago::MEDIO_YAPE => 'Yape',
            Pago::MEDIO_PLIN => 'Plin',
            Pago::MEDIO_TRANSFERENCIA => 'Transferencia',
            Pago::MEDIO_AGORA => 'Agora',
            Pago::MEDIO_SIP => 'Sip',
            default => 'Otro',
        };
    }

    private function motivoLabel(string $motivo): string
    {
        return match ($motivo) {
            CajaEgreso::MOTIVO_INSUMOS => 'Insumos',
            CajaEgreso::MOTIVO_DELIVERY => 'Delivery / envíos',
            CajaEgreso::MOTIVO_SERVICIOS => 'Servicios',
            CajaEgreso::MOTIVO_PERSONAL => 'Personal',
            CajaEgreso::MOTIVO_CAMBIO => 'Cambio / vuelto',
            default => 'Otros',
        };
    }

    private function money(string $value): string
    {
        if (! is_numeric($value)) {
            return '0.00';
        }

        return number_format((float) $value, 2, '.', '');
    }

    private function add(string $a, string $b): string
    {
        return $this->money((string) ((float) $a + (float) $b));
    }

    private function sub(string $a, string $b): string
    {
        return $this->money((string) ((float) $a - (float) $b));
    }
}

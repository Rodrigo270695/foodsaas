<?php

declare(strict_types=1);

namespace App\Services\Dashboard;

use App\Models\CajaSesion;
use App\Models\Pago;
use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Models\Venta;
use App\Support\Sedes\ActiveSedeContext;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

final class TenantDashboardMetrics
{
    private const TREND_DAYS = 14;

    /**
     * @return array{
     *     sede_id: string|null,
     *     kpis: array{
     *         ventas_hoy: float,
     *         ventas_ayer: float,
     *         delta_pct: float|null,
     *         ventas_count: int,
     *         ticket_promedio: float,
     *         pedidos_abiertos: int,
     *         cocina_en_cola: int,
     *         mesas_ocupadas: int,
     *         caja_abierta: bool
     *     },
     *     ventas_trend: list<array{date: string, label: string, monto: float, count: int}>,
     *     medios: list<array{medio: string, monto: float, count: int}>,
     *     por_canal: list<array{canal: string, count: int, monto: float}>,
     *     top_productos: list<array{nombre: string, cantidad: float, importe: float}>
     * }
     */
    public function build(): array
    {
        $sedeId = ActiveSedeContext::id();
        $hoy = now()->toDateString();
        $ayer = now()->subDay()->toDateString();

        if ($sedeId === null || $sedeId === '') {
            return $this->emptyPayload(null);
        }

        $ventasHoy = $this->ventasDelDia($sedeId, $hoy);
        $ventasAyer = $this->ventasDelDia($sedeId, $ayer);
        $deltaPct = $this->deltaPct($ventasHoy['monto'], $ventasAyer['monto']);

        return [
            'sede_id' => $sedeId,
            'kpis' => [
                'ventas_hoy' => $ventasHoy['monto'],
                'ventas_ayer' => $ventasAyer['monto'],
                'delta_pct' => $deltaPct,
                'ventas_count' => $ventasHoy['count'],
                'ticket_promedio' => $ventasHoy['count'] > 0
                    ? round($ventasHoy['monto'] / $ventasHoy['count'], 2)
                    : 0.0,
                'pedidos_abiertos' => $this->pedidosAbiertos($sedeId),
                'cocina_en_cola' => $this->cocinaEnCola($sedeId),
                'mesas_ocupadas' => $this->mesasOcupadas($sedeId),
                'caja_abierta' => $this->cajaAbierta($sedeId),
            ],
            'ventas_trend' => $this->ventasTrend($sedeId),
            'medios' => $this->mediosHoy($sedeId, $hoy),
            'por_canal' => $this->porCanalHoy($sedeId, $hoy),
            'top_productos' => $this->topProductosHoy($sedeId, $hoy),
        ];
    }

    /**
     * @return array{
     *     sede_id: string|null,
     *     kpis: array{
     *         ventas_hoy: float,
     *         ventas_ayer: float,
     *         delta_pct: float|null,
     *         ventas_count: int,
     *         ticket_promedio: float,
     *         pedidos_abiertos: int,
     *         cocina_en_cola: int,
     *         mesas_ocupadas: int,
     *         caja_abierta: bool
     *     },
     *     ventas_trend: list<array{date: string, label: string, monto: float, count: int}>,
     *     medios: list<array{medio: string, monto: float, count: int}>,
     *     por_canal: list<array{canal: string, count: int, monto: float}>,
     *     top_productos: list<array{nombre: string, cantidad: float, importe: float}>
     * }
     */
    private function emptyPayload(?string $sedeId): array
    {
        return [
            'sede_id' => $sedeId,
            'kpis' => [
                'ventas_hoy' => 0.0,
                'ventas_ayer' => 0.0,
                'delta_pct' => null,
                'ventas_count' => 0,
                'ticket_promedio' => 0.0,
                'pedidos_abiertos' => 0,
                'cocina_en_cola' => 0,
                'mesas_ocupadas' => 0,
                'caja_abierta' => false,
            ],
            'ventas_trend' => $this->emptyTrend(),
            'medios' => [],
            'por_canal' => [],
            'top_productos' => [],
        ];
    }

    /**
     * @return array{monto: float, count: int}
     */
    private function ventasDelDia(string $sedeId, string $fecha): array
    {
        $base = Venta::query()
            ->where('sede_id', $sedeId)
            ->where('estado', Venta::ESTADO_PAGADA)
            ->whereDate('created_at', $fecha);

        $monto = (float) (clone $base)->sum('total');
        $count = (int) (clone $base)->count();

        return [
            'monto' => round($monto, 2),
            'count' => $count,
        ];
    }

    private function deltaPct(float $hoy, float $ayer): ?float
    {
        if ($ayer <= 0.0) {
            return $hoy > 0.0 ? 100.0 : null;
        }

        return round((($hoy - $ayer) / $ayer) * 100, 1);
    }

    private function pedidosAbiertos(string $sedeId): int
    {
        return (int) Pedido::query()
            ->where('sede_id', $sedeId)
            ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
            ->count();
    }

    private function cocinaEnCola(string $sedeId): int
    {
        return (int) PedidoLinea::query()
            ->join('ope_pedidos', 'ope_pedidos.id', '=', 'ope_pedido_lineas.pedido_id')
            ->where('ope_pedidos.sede_id', $sedeId)
            ->whereIn('ope_pedidos.estado', Pedido::ESTADOS_ACTIVOS)
            ->where('ope_pedido_lineas.estado', PedidoLinea::ESTADO_EN_COLA)
            ->count();
    }

    private function mesasOcupadas(string $sedeId): int
    {
        return (int) Pedido::query()
            ->where('sede_id', $sedeId)
            ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
            ->whereNotNull('mesa_id')
            ->selectRaw('COUNT(DISTINCT mesa_id) as aggregate')
            ->value('aggregate');
    }

    private function cajaAbierta(string $sedeId): bool
    {
        return CajaSesion::query()
            ->where('sede_id', $sedeId)
            ->where('estado', CajaSesion::ESTADO_ABIERTA)
            ->exists();
    }

    /**
     * @return list<array{date: string, label: string, monto: float, count: int}>
     */
    private function ventasTrend(string $sedeId): array
    {
        $desde = now()->subDays(self::TREND_DAYS - 1)->startOfDay();
        $hasta = now()->endOfDay();

        $indexed = [];
        Venta::query()
            ->select([
                DB::raw('DATE(created_at) as dia'),
                DB::raw('SUM(total) as monto'),
                DB::raw('COUNT(*) as count'),
            ])
            ->where('sede_id', $sedeId)
            ->where('estado', Venta::ESTADO_PAGADA)
            ->where('created_at', '>=', $desde)
            ->where('created_at', '<=', $hasta)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->get()
            ->each(function ($row) use (&$indexed): void {
                $key = Carbon::parse((string) $row->dia)->toDateString();
                $indexed[$key] = [
                    'monto' => round((float) $row->monto, 2),
                    'count' => (int) $row->count,
                ];
            });

        $out = [];
        for ($i = self::TREND_DAYS - 1; $i >= 0; $i--) {
            $day = now()->subDays($i);
            $key = $day->toDateString();
            $out[] = [
                'date' => $key,
                'label' => $day->format('d/m'),
                'monto' => (float) ($indexed[$key]['monto'] ?? 0),
                'count' => (int) ($indexed[$key]['count'] ?? 0),
            ];
        }

        return $out;
    }

    /**
     * @return list<array{date: string, label: string, monto: float, count: int}>
     */
    private function emptyTrend(): array
    {
        $out = [];
        for ($i = self::TREND_DAYS - 1; $i >= 0; $i--) {
            $day = Carbon::now()->subDays($i);
            $out[] = [
                'date' => $day->toDateString(),
                'label' => $day->format('d/m'),
                'monto' => 0.0,
                'count' => 0,
            ];
        }

        return $out;
    }

    /**
     * @return list<array{medio: string, monto: float, count: int}>
     */
    private function mediosHoy(string $sedeId, string $hoy): array
    {
        return Pago::query()
            ->select([
                'fin_pagos.medio',
                DB::raw('SUM(fin_pagos.monto) as monto'),
                DB::raw('COUNT(*) as count'),
            ])
            ->join('fin_ventas', 'fin_ventas.id', '=', 'fin_pagos.venta_id')
            ->where('fin_ventas.sede_id', $sedeId)
            ->where('fin_ventas.estado', Venta::ESTADO_PAGADA)
            ->whereDate('fin_ventas.created_at', $hoy)
            ->groupBy('fin_pagos.medio')
            ->orderByDesc('monto')
            ->get()
            ->map(fn ($row) => [
                'medio' => (string) $row->medio,
                'monto' => round((float) $row->monto, 2),
                'count' => (int) $row->count,
            ])
            ->all();
    }

    /**
     * @return list<array{canal: string, count: int, monto: float}>
     */
    private function porCanalHoy(string $sedeId, string $hoy): array
    {
        return Pedido::query()
            ->select([
                'ope_pedidos.canal',
                DB::raw('COUNT(DISTINCT ope_pedidos.id) as count'),
                DB::raw('COALESCE(SUM(fin_ventas.total), 0) as monto'),
            ])
            ->leftJoin('fin_ventas', function ($join) {
                $join->on('fin_ventas.pedido_id', '=', 'ope_pedidos.id')
                    ->where('fin_ventas.estado', '=', Venta::ESTADO_PAGADA);
            })
            ->where('ope_pedidos.sede_id', $sedeId)
            ->whereDate('ope_pedidos.created_at', $hoy)
            ->where('ope_pedidos.estado', '!=', Pedido::ESTADO_ANULADO)
            ->groupBy('ope_pedidos.canal')
            ->orderByDesc('monto')
            ->get()
            ->map(fn ($row) => [
                'canal' => (string) $row->canal,
                'count' => (int) $row->count,
                'monto' => round((float) $row->monto, 2),
            ])
            ->all();
    }

    /**
     * @return list<array{nombre: string, cantidad: float, importe: float}>
     */
    private function topProductosHoy(string $sedeId, string $hoy): array
    {
        return PedidoLinea::query()
            ->select([
                'ope_pedido_lineas.nombre',
                DB::raw('SUM(ope_pedido_lineas.cantidad) as cantidad'),
                DB::raw('SUM(ope_pedido_lineas.importe) as importe'),
            ])
            ->join('ope_pedidos', 'ope_pedidos.id', '=', 'ope_pedido_lineas.pedido_id')
            ->join('fin_ventas', 'fin_ventas.pedido_id', '=', 'ope_pedidos.id')
            ->where('fin_ventas.sede_id', $sedeId)
            ->where('fin_ventas.estado', Venta::ESTADO_PAGADA)
            ->whereDate('fin_ventas.created_at', $hoy)
            ->where('ope_pedido_lineas.estado', '!=', PedidoLinea::ESTADO_ANULADO)
            ->groupBy('ope_pedido_lineas.nombre')
            ->orderByDesc('importe')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'nombre' => (string) $row->nombre,
                'cantidad' => round((float) $row->cantidad, 3),
                'importe' => round((float) $row->importe, 2),
            ])
            ->all();
    }
}

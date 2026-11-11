<?php

namespace App\Http\Controllers;

use App\Exports\ReportesOperacionXlsxExport;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\MovimientoInventario;
use App\Models\Pago;
use App\Models\PedidoLinea;
use App\Models\Venta;
use App\Support\Sedes\ActiveSedeContext;
use App\Support\Tenancy\TenantModuleRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReporteOperacionController extends Controller
{
    use ResolvesTenantId;

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        [$desde, $hasta, $sedeId] = $this->resolveRange($request);

        $stats = $this->buildStats($sedeId, $desde, $hasta);
        $foodcostEnabled = TenantModuleRegistry::isEnabled(tenant()?->tenant, 'insumos');

        return Inertia::render('reportes/index', [
            'filters' => [
                'desde' => $desde,
                'hasta' => $hasta,
            ],
            'stats' => $stats,
            'medios' => $this->buildMedios($sedeId, $desde, $hasta),
            'por_comprobante' => $this->buildPorComprobante($sedeId, $desde, $hasta),
            'top_productos' => $this->buildTopProductos($sedeId, $desde, $hasta),
            'foodcost' => $foodcostEnabled
                ? $this->buildFoodcost($sedeId, $desde, $hasta, (float) $stats['monto_total'])
                : null,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $this->tenantIdOrAbort();
        [$desde, $hasta, $sedeId] = $this->resolveRange($request);

        $stats = $this->buildStats($sedeId, $desde, $hasta);
        $foodcostEnabled = TenantModuleRegistry::isEnabled(tenant()?->tenant, 'insumos');

        $export = new ReportesOperacionXlsxExport(
            stats: $stats,
            medios: $this->buildMedios($sedeId, $desde, $hasta),
            porComprobante: $this->buildPorComprobante($sedeId, $desde, $hasta),
            topProductos: $this->buildTopProductos($sedeId, $desde, $hasta, 50),
            desde: $desde,
            hasta: $hasta,
            foodcost: $foodcostEnabled
                ? $this->buildFoodcost($sedeId, $desde, $hasta, (float) $stats['monto_total'])
                : null,
        );

        $filename = 'reportes-'.$desde.'_'.$hasta.'.xlsx';

        return response()->streamDownload(
            static fn () => $export->writeToPhpOutput(),
            $filename,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
        );
    }

    /**
     * @return array{0: string, 1: string, 2: string}
     */
    private function resolveRange(Request $request): array
    {
        $parseDate = static function (string $value): string {
            $value = trim($value);

            return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 ? $value : '';
        };

        $desde = $parseDate((string) $request->string('desde', ''));
        $hasta = $parseDate((string) $request->string('hasta', ''));
        $hoy = now()->toDateString();

        if ($desde === '' && $hasta === '') {
            $desde = $hoy;
            $hasta = $hoy;
        } elseif ($desde === '') {
            $desde = $hasta;
        } elseif ($hasta === '') {
            $hasta = $desde;
        }

        if ($desde > $hasta) {
            [$desde, $hasta] = [$hasta, $desde];
        }

        return [$desde, $hasta, (string) (ActiveSedeContext::id() ?? '')];
    }

    /**
     * @return array{monto_total: float, ventas_count: int, ticket_promedio: float, anuladas: int}
     */
    private function buildStats(string $sedeId, string $desde, string $hasta): array
    {
        if ($sedeId === '') {
            return [
                'monto_total' => 0.0,
                'ventas_count' => 0,
                'ticket_promedio' => 0.0,
                'anuladas' => 0,
            ];
        }

        $base = Venta::query()
            ->where('sede_id', $sedeId)
            ->whereDate('created_at', '>=', $desde)
            ->whereDate('created_at', '<=', $hasta);

        $pagadas = (clone $base)->where('estado', Venta::ESTADO_PAGADA);
        $monto = (float) (clone $pagadas)->sum('total');
        $count = (int) (clone $pagadas)->count();
        $anuladas = (int) (clone $base)->where('estado', Venta::ESTADO_ANULADA)->count();

        return [
            'monto_total' => round($monto, 2),
            'ventas_count' => $count,
            'ticket_promedio' => $count > 0 ? round($monto / $count, 2) : 0.0,
            'anuladas' => $anuladas,
        ];
    }

    /**
     * @return list<array{medio: string, monto: float, count: int}>
     */
    private function buildMedios(string $sedeId, string $desde, string $hasta): array
    {
        if ($sedeId === '') {
            return [];
        }

        return Pago::query()
            ->select([
                'fin_pagos.medio',
                DB::raw('SUM(fin_pagos.monto) as monto'),
                DB::raw('COUNT(*) as count'),
            ])
            ->join('fin_ventas', 'fin_ventas.id', '=', 'fin_pagos.venta_id')
            ->where('fin_ventas.sede_id', $sedeId)
            ->where('fin_ventas.estado', Venta::ESTADO_PAGADA)
            ->whereDate('fin_ventas.created_at', '>=', $desde)
            ->whereDate('fin_ventas.created_at', '<=', $hasta)
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
     * @return list<array{tipo: string, count: int, monto: float}>
     */
    private function buildPorComprobante(string $sedeId, string $desde, string $hasta): array
    {
        if ($sedeId === '') {
            return [];
        }

        return Venta::query()
            ->select([
                'tipo_comprobante',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(total) as monto'),
            ])
            ->where('sede_id', $sedeId)
            ->where('estado', Venta::ESTADO_PAGADA)
            ->whereDate('created_at', '>=', $desde)
            ->whereDate('created_at', '<=', $hasta)
            ->groupBy('tipo_comprobante')
            ->orderByDesc('monto')
            ->get()
            ->map(fn ($row) => [
                'tipo' => (string) $row->tipo_comprobante,
                'count' => (int) $row->count,
                'monto' => round((float) $row->monto, 2),
            ])
            ->all();
    }

    /**
     * @return list<array{nombre: string, cantidad: float, importe: float}>
     */
    private function buildTopProductos(string $sedeId, string $desde, string $hasta, int $limit = 10): array
    {
        if ($sedeId === '') {
            return [];
        }

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
            ->whereDate('fin_ventas.created_at', '>=', $desde)
            ->whereDate('fin_ventas.created_at', '<=', $hasta)
            ->where('ope_pedido_lineas.estado', '!=', PedidoLinea::ESTADO_ANULADO)
            ->groupBy('ope_pedido_lineas.nombre')
            ->orderByDesc('importe')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'nombre' => (string) $row->nombre,
                'cantidad' => round((float) $row->cantidad, 3),
                'importe' => round((float) $row->importe, 2),
            ])
            ->all();
    }

    /**
     * Costo teórico de insumos consumidos al cobrar (movimientos tipo venta).
     *
     * @return array{
     *     costo_teorico: float,
     *     ventas_monto: float,
     *     porcentaje: float|null,
     *     top_insumos: list<array{nombre: string, unidad: string|null, cantidad: float, costo: float}>
     * }
     */
    private function buildFoodcost(string $sedeId, string $desde, string $hasta, float $ventasMonto): array
    {
        if ($sedeId === '') {
            return [
                'costo_teorico' => 0.0,
                'ventas_monto' => 0.0,
                'porcentaje' => null,
                'top_insumos' => [],
            ];
        }

        $ventaIds = Venta::query()
            ->where('sede_id', $sedeId)
            ->where('estado', Venta::ESTADO_PAGADA)
            ->whereDate('created_at', '>=', $desde)
            ->whereDate('created_at', '<=', $hasta)
            ->pluck('id');

        if ($ventaIds->isEmpty()) {
            return [
                'costo_teorico' => 0.0,
                'ventas_monto' => round($ventasMonto, 2),
                'porcentaje' => null,
                'top_insumos' => [],
            ];
        }

        $base = MovimientoInventario::query()
            ->whereNotNull('insumo_id')
            ->where('tipo', MovimientoInventario::TIPO_VENTA)
            ->where('referencia_tipo', 'venta')
            ->whereIn('referencia_id', $ventaIds);

        $costoTeorico = round((float) (clone $base)->sum('costo_total'), 2);

        $topInsumos = (clone $base)
            ->select([
                'inv_insumos.nombre',
                'inv_insumos.unidad',
                DB::raw('SUM(inv_movimientos.cantidad) as cantidad'),
                DB::raw('SUM(inv_movimientos.costo_total) as costo'),
            ])
            ->join('inv_insumos', 'inv_insumos.id', '=', 'inv_movimientos.insumo_id')
            ->groupBy('inv_insumos.id', 'inv_insumos.nombre', 'inv_insumos.unidad')
            ->orderByDesc('costo')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'nombre' => (string) $row->nombre,
                'unidad' => $row->unidad !== null ? (string) $row->unidad : null,
                'cantidad' => round((float) $row->cantidad, 3),
                'costo' => round((float) $row->costo, 2),
            ])
            ->all();

        $porcentaje = $ventasMonto > 0
            ? round(($costoTeorico / $ventasMonto) * 100, 2)
            : null;

        return [
            'costo_teorico' => $costoTeorico,
            'ventas_monto' => round($ventasMonto, 2),
            'porcentaje' => $porcentaje,
            'top_insumos' => $topInsumos,
        ];
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\Pago;
use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Models\Venta;
use App\Services\Operacion\CajaService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class VentaController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    public function index(CajaService $caja): Response
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $sesion = $sedeId === '' ? null : $caja->sesionAbierta($sedeId);

        $ventas = $sedeId === ''
            ? collect()
            : Venta::query()
                ->with([
                    'pedido:id,numero,canal,mesa_id',
                    'pedido.mesa:id,codigo,nombre',
                    'pagos',
                    'createdBy:id,name',
                ])
                ->where('sede_id', $sedeId)
                ->where('estado', Venta::ESTADO_PAGADA)
                ->whereDate('created_at', now()->toDateString())
                ->orderByDesc('created_at')
                ->limit(80)
                ->get();

        $pedidosPendientes = $sedeId === ''
            ? collect()
            : Pedido::query()
                ->with(['mesa:id,codigo,nombre', 'openedBy:id,name'])
                ->where('sede_id', $sedeId)
                ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
                ->where('total', '>', 0)
                ->whereHas('lineas', fn ($q) => $q->whereIn('estado', [
                    PedidoLinea::ESTADO_EN_COLA,
                    PedidoLinea::ESTADO_LISTO,
                ]))
                ->orderByDesc('updated_at')
                ->get(['id', 'numero', 'mesa_id', 'canal', 'estado', 'total', 'subtotal', 'descuento', 'opened_by', 'updated_at']);

        return Inertia::render('ventas/index', [
            'sesion_abierta' => $sesion !== null,
            'ventas' => $ventas,
            'pedidos_pendientes' => $pedidosPendientes,
            'filters' => [
                'sede_id' => $sedeId !== '' ? $sedeId : null,
            ],
            'stats' => [
                'pendientes' => $pedidosPendientes->count(),
                'ventas_hoy' => $ventas->count(),
                'total_hoy' => round((float) $ventas->sum('total'), 2),
            ],
        ]);
    }

    public function cobrarForm(Pedido $pedido, CajaService $caja): Response
    {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $pedido->sede_id);

        $pedido->load([
            'mesa:id,codigo,nombre',
            'openedBy:id,name',
            'lineas' => fn ($q) => $q->whereIn('estado', [
                PedidoLinea::ESTADO_EN_COLA,
                PedidoLinea::ESTADO_LISTO,
                PedidoLinea::ESTADO_PENDIENTE,
            ]),
        ]);

        $sesion = $caja->sesionAbierta((string) $pedido->sede_id);

        return Inertia::render('ventas/cobrar', [
            'pedido' => $pedido,
            'sesion_abierta' => $sesion !== null,
            'medios' => Pago::MEDIOS,
        ]);
    }

    public function cobrar(Request $request, Pedido $pedido, CajaService $caja): RedirectResponse
    {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $pedido->sede_id);

        $data = $request->validate([
            'descuento' => ['nullable', 'numeric', 'min:0'],
            'pagos' => ['required', 'array', 'min:1'],
            'pagos.*.medio' => ['required', Rule::in(Pago::MEDIOS)],
            'pagos.*.monto' => ['required', 'numeric', 'min:0.01'],
            'pagos.*.referencia' => ['nullable', 'string', 'max:120'],
        ]);

        $venta = $caja->cobrarPedido(
            $pedido,
            $data['pagos'],
            isset($data['descuento']) ? (float) $data['descuento'] : null,
        );

        return redirect()
            ->route('ventas.index')
            ->with('success', 'Venta registrada por S/ '.number_format((float) $venta->total, 2));
    }
}

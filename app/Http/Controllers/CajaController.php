<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\CajaSesion;
use App\Models\Pago;
use App\Models\Pedido;
use App\Models\Venta;
use App\Services\Operacion\CajaService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CajaController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    public function index(CajaService $caja): Response
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $sesion = $sedeId === '' ? null : $caja->sesionAbierta($sedeId);

        $ventasHoy = $sedeId === ''
            ? collect()
            : Venta::query()
                ->with(['pedido:id,numero,canal,mesa_id', 'pedido.mesa:id,codigo,nombre', 'pagos'])
                ->where('sede_id', $sedeId)
                ->where('estado', Venta::ESTADO_PAGADA)
                ->whereDate('created_at', now()->toDateString())
                ->orderByDesc('created_at')
                ->limit(50)
                ->get();

        $pedidosPendientes = $sedeId === ''
            ? collect()
            : Pedido::query()
                ->with(['mesa:id,codigo,nombre'])
                ->where('sede_id', $sedeId)
                ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
                ->where('total', '>', 0)
                ->orderByDesc('updated_at')
                ->get(['id', 'numero', 'mesa_id', 'canal', 'estado', 'total', 'subtotal', 'descuento', 'updated_at']);

        $totalesSesion = [
            'ventas' => 0.0,
            'efectivo' => 0.0,
            'tarjeta' => 0.0,
            'otros' => 0.0,
            'conteo' => 0,
        ];

        if ($sesion !== null) {
            $ventasSesion = Venta::query()
                ->with('pagos')
                ->where('caja_sesion_id', $sesion->id)
                ->where('estado', Venta::ESTADO_PAGADA)
                ->get();

            $totalesSesion['conteo'] = $ventasSesion->count();
            $totalesSesion['ventas'] = round((float) $ventasSesion->sum('total'), 2);

            foreach ($ventasSesion as $venta) {
                foreach ($venta->pagos as $pago) {
                    $monto = (float) $pago->monto;
                    match ($pago->medio) {
                        Pago::MEDIO_EFECTIVO => $totalesSesion['efectivo'] += $monto,
                        Pago::MEDIO_TARJETA => $totalesSesion['tarjeta'] += $monto,
                        default => $totalesSesion['otros'] += $monto,
                    };
                }
            }

            $totalesSesion['efectivo'] = round($totalesSesion['efectivo'], 2);
            $totalesSesion['tarjeta'] = round($totalesSesion['tarjeta'], 2);
            $totalesSesion['otros'] = round($totalesSesion['otros'], 2);
        }

        return Inertia::render('caja/index', [
            'sesion' => $sesion?->load(['openedBy:id,name']),
            'totales_sesion' => $totalesSesion,
            'ventas_hoy' => $ventasHoy,
            'pedidos_pendientes' => $pedidosPendientes,
            'medios' => Pago::MEDIOS,
            'filters' => [
                'sede_id' => $sedeId !== '' ? $sedeId : null,
            ],
        ]);
    }

    public function abrir(Request $request, CajaService $caja): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $data = $request->validate([
            'monto_apertura' => ['nullable', 'numeric', 'min:0', 'max:999999'],
        ]);

        $caja->abrirSesion($sedeId, (float) ($data['monto_apertura'] ?? 0));

        return back()->with('success', 'Caja abierta.');
    }

    public function cerrar(Request $request, CajaService $caja): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $sesion = $caja->sesionAbierta($sedeId);
        if ($sesion === null) {
            return back()->with('error', 'No hay caja abierta.');
        }

        $data = $request->validate([
            'monto_contado' => ['required', 'numeric', 'min:0', 'max:999999'],
            'notas' => ['nullable', 'string', 'max:500'],
        ]);

        $caja->cerrarSesion($sesion, (float) $data['monto_contado'], $data['notas'] ?? null);

        return back()->with('success', 'Caja cerrada.');
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
            ->route('caja.index')
            ->with('success', 'Venta registrada por S/ '.number_format((float) $venta->total, 2));
    }
}

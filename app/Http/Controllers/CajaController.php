<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\CajaEgreso;
use App\Models\CajaSesion;
use App\Models\Pago;
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

        $sesiones = $sedeId === ''
            ? collect()
            : CajaSesion::query()
                ->with(['openedBy:id,name', 'closedBy:id,name'])
                ->where('sede_id', $sedeId)
                ->orderByDesc('opened_at')
                ->limit(40)
                ->get();

        $totalesSesion = [
            'ventas' => 0.0,
            'efectivo' => 0.0,
            'tarjeta' => 0.0,
            'otros' => 0.0,
            'egresos' => 0.0,
            'conteo' => 0,
        ];

        $egresos = collect();

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

            $egresos = CajaEgreso::query()
                ->with(['createdBy:id,name'])
                ->where('caja_sesion_id', $sesion->id)
                ->orderByDesc('created_at')
                ->get();

            $totalesSesion['egresos'] = round((float) $egresos->sum('monto'), 2);
            $totalesSesion['efectivo'] = round($totalesSesion['efectivo'], 2);
            $totalesSesion['tarjeta'] = round($totalesSesion['tarjeta'], 2);
            $totalesSesion['otros'] = round($totalesSesion['otros'], 2);
        }

        $sistemaEfectivo = $sesion
            ? round(
                (float) $sesion->monto_apertura
                + $totalesSesion['efectivo']
                - (float) $egresos->where('medio', Pago::MEDIO_EFECTIVO)->sum('monto'),
                2,
            )
            : 0.0;

        return Inertia::render('caja/index', [
            'sesion' => $sesion?->load(['openedBy:id,name']),
            'sesiones' => $sesiones,
            'egresos' => $egresos,
            'totales_sesion' => $totalesSesion,
            'sistema_efectivo' => $sistemaEfectivo,
            'motivos_egreso' => CajaEgreso::MOTIVOS,
            'medios' => Pago::MEDIOS,
            'filters' => [
                'sede_id' => $sedeId !== '' ? $sedeId : null,
            ],
            'stats' => [
                'sesiones' => $sesiones->count(),
                'abiertas' => $sesiones->where('estado', CajaSesion::ESTADO_ABIERTA)->count(),
                'cerradas' => $sesiones->where('estado', CajaSesion::ESTADO_CERRADA)->count(),
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

    public function egreso(Request $request, CajaService $caja): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $sesion = $caja->sesionAbierta($sedeId);
        if ($sesion === null) {
            return back()->with('error', 'No hay caja abierta.');
        }

        $data = $request->validate([
            'monto' => ['required', 'numeric', 'min:0.01', 'max:999999'],
            'medio' => ['required', Rule::in(Pago::MEDIOS)],
            'motivo' => ['required', Rule::in(CajaEgreso::MOTIVOS)],
            'notas' => ['nullable', 'string', 'max:500'],
        ]);

        $caja->registrarEgreso($sesion, $data);

        return back()->with('success', 'Egreso registrado.');
    }
}

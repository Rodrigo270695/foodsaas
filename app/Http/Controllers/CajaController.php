<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\CajaEgreso;
use App\Models\CajaSesion;
use App\Models\Pago;
use App\Models\Venta;
use App\Services\Operacion\CajaService;
use App\Services\Operacion\CajaSesionArqueoPdfService;
use App\Services\Operacion\CajaSesionArqueoService;
use App\Support\Caja\CajaBilleteras;
use App\Support\Caja\TicketAnchoMm;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class CajaController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    public function index(CajaService $caja): InertiaResponse
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $sesion = $sedeId === '' ? null : $caja->sesionAbierta($sedeId);
        $authId = Auth::id();

        $sesiones = $sedeId === ''
            ? collect()
            : CajaSesion::query()
                ->with(['openedBy:id,name', 'closedBy:id,name'])
                ->where('sede_id', $sedeId)
                ->orderByDesc('opened_at')
                ->limit(40)
                ->get();

        $sedesConAbierta = CajaSesion::query()
            ->where('estado', CajaSesion::ESTADO_ABIERTA)
            ->pluck('sede_id')
            ->flip();

        $sesiones = $sesiones->map(function (CajaSesion $s) use ($sedesConAbierta): CajaSesion {
            $s->setAttribute(
                'puede_reabrir',
                $s->estaDentroDeVentanaReabrir() && ! $sedesConAbierta->has($s->sede_id),
            );

            return $s;
        });

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
            'sesiones' => $sesiones->values(),
            'egresos' => $egresos,
            'totales_sesion' => $totalesSesion,
            'sistema_efectivo' => $sistemaEfectivo,
            'motivos_egreso' => CajaEgreso::MOTIVOS,
            'medios' => Pago::MEDIOS,
            'billeteras' => CajaBilleteras::CODIGOS,
            'filters' => [
                'sede_id' => $sedeId !== '' ? $sedeId : null,
            ],
            'stats' => [
                'sesiones' => $sesiones->count(),
                'abiertas' => $sesiones->where('estado', CajaSesion::ESTADO_ABIERTA)->count(),
                'cerradas' => $sesiones->where('estado', CajaSesion::ESTADO_CERRADA)->count(),
            ],
            'auth_user_id' => $authId,
        ]);
    }

    public function abrir(Request $request, CajaService $caja): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $data = $request->validate([
            'moneda' => ['nullable', 'string', Rule::in(['PEN', 'USD'])],
            'monto_apertura' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'notas' => ['nullable', 'string', 'max:500'],
            ...CajaBilleteras::validationRules('saldos_apertura', false),
        ]);

        $caja->abrirSesion($sedeId, $data);

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
            'saldo_cierre_efectivo' => ['required_without:monto_contado', 'numeric', 'min:0', 'max:999999'],
            'monto_contado' => ['required_without:saldo_cierre_efectivo', 'numeric', 'min:0', 'max:999999'],
            // El esperado de una billetera puede quedar bajo cero si los egresos de
            // ese canal superan lo cobrado; el modal precarga ese número.
            ...CajaBilleteras::validationRules('saldos_cierre', false, allowNegative: true),
            'notas' => ['nullable', 'string', 'max:500'],
        ]);

        $caja->cerrarSesion($sesion, $data);

        return back()->with('success', 'Caja cerrada.');
    }

    public function reabrir(CajaSesion $cajaSesion, CajaService $caja): RedirectResponse
    {
        $this->tenantIdOrAbort();

        $caja->reabrirSesion($cajaSesion);

        return back()->with('success', 'Sesión de caja reabierta.');
    }

    public function arqueo(CajaSesion $cajaSesion, CajaSesionArqueoService $arqueoService): JsonResponse
    {
        $this->tenantIdOrAbort();

        $contado = $cajaSesion->monto_cierre_contado !== null
            ? (string) $cajaSesion->monto_cierre_contado
            : null;

        $billeteras = is_array($cajaSesion->saldos_cierre_json) && $cajaSesion->saldos_cierre_json !== []
            ? CajaBilleteras::normalize($cajaSesion->saldos_cierre_json)
            : null;

        if (is_array($cajaSesion->arqueo_json) && $cajaSesion->arqueo_json !== [] && ! $cajaSesion->isAbierta()) {
            $arqueo = $cajaSesion->arqueo_json;
            if (! isset($arqueo['billeteras']) || ! is_array($arqueo['billeteras'])) {
                $arqueo = $arqueoService->build($cajaSesion, $contado, $billeteras);
            }

            return response()->json(['arqueo' => $arqueo]);
        }

        return response()->json([
            'arqueo' => $arqueoService->build($cajaSesion, $contado, $billeteras),
        ]);
    }

    public function arqueoPdf(
        CajaSesion $cajaSesion,
        CajaSesionArqueoPdfService $pdfService,
        Request $request,
    ): Response {
        $tenantId = $this->tenantIdOrAbort();

        $cajaSesion->loadMissing(['openedBy:id,name', 'closedBy:id,name']);

        $formato = CajaSesionArqueoPdfService::normalizeFormato(
            (string) $request->string('formato', 'a4'),
            TicketAnchoMm::DEFAULT,
        );

        return $pdfService->stream($cajaSesion, $tenantId, null, $formato);
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

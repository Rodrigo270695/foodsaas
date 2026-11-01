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

    public function index(Request $request, CajaService $caja): InertiaResponse
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $sesionSede = $sedeId === '' ? null : $caja->sesionAbierta($sedeId);
        $authId = Auth::id() !== null ? (int) Auth::id() : null;
        $miSesion = $caja->sesionAbiertaDelUsuario($authId);

        // "Tu sesión" solo si la abierta de la sede activa la abriste tú.
        $sesion = ($sesionSede !== null && $authId !== null && (int) $sesionSede->opened_by === $authId)
            ? $sesionSede
            : null;

        $sedeIds = ActiveSedeContext::accessibleIds();
        $perPage = (int) $request->integer('per_page', 10);
        if (! in_array($perPage, [10, 15, 20, 25, 50], true)) {
            $perPage = 10;
        }

        $sedesConAbierta = CajaSesion::query()
            ->where('estado', CajaSesion::ESTADO_ABIERTA)
            ->pluck('sede_id')
            ->flip();

        $cajerosConAbierta = CajaSesion::query()
            ->where('estado', CajaSesion::ESTADO_ABIERTA)
            ->whereNotNull('opened_by')
            ->pluck('opened_by')
            ->map(fn ($id) => (int) $id)
            ->flip();

        $baseQuery = CajaSesion::query()
            ->with([
                'openedBy:id,name',
                'closedBy:id,name',
                'sede:id,nombre,codigo',
            ])
            ->when(
                $sedeIds === [],
                fn ($q) => $q->whereRaw('1 = 0'),
                fn ($q) => $q->whereIn('sede_id', $sedeIds),
            )
            ->orderByDesc('opened_at');

        $statsTotal = (clone $baseQuery)->count();
        $statsAbiertas = (clone $baseQuery)
            ->where('estado', CajaSesion::ESTADO_ABIERTA)
            ->count();
        $statsCerradas = max(0, $statsTotal - $statsAbiertas);

        $sesiones = $baseQuery
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (CajaSesion $s) use ($sedesConAbierta, $cajerosConAbierta): CajaSesion {
                $cajeroLibre = $s->opened_by === null
                    || ! $cajerosConAbierta->has((int) $s->opened_by);

                $s->setAttribute(
                    'puede_reabrir',
                    $s->estaDentroDeVentanaReabrir()
                    && ! $sedesConAbierta->has($s->sede_id)
                    && $cajeroLibre,
                );

                return $s;
            });

        $puedeAbrir = $sedeId !== ''
            && $sesionSede === null
            && $miSesion === null;

        $totalesSesion = [
            'ventas' => 0.0,
            'efectivo' => 0.0,
            'tarjeta' => 0.0,
            'otros' => 0.0,
            'egresos' => 0.0,
            'conteo' => 0,
        ];

        $egresos = collect();

        if ($sesionSede !== null) {
            $ventasSesion = Venta::query()
                ->with('pagos')
                ->where('caja_sesion_id', $sesionSede->id)
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
                ->where('caja_sesion_id', $sesionSede->id)
                ->orderByDesc('created_at')
                ->get();

            $totalesSesion['egresos'] = round((float) $egresos->sum('monto'), 2);
            $totalesSesion['efectivo'] = round($totalesSesion['efectivo'], 2);
            $totalesSesion['tarjeta'] = round($totalesSesion['tarjeta'], 2);
            $totalesSesion['otros'] = round($totalesSesion['otros'], 2);
        }

        $sistemaEfectivo = $sesionSede
            ? round(
                (float) $sesionSede->monto_apertura
                + $totalesSesion['efectivo']
                - (float) $egresos->where('medio', Pago::MEDIO_EFECTIVO)->sum('monto'),
                2,
            )
            : 0.0;

        return Inertia::render('caja/index', [
            'sesion' => $sesion?->load(['openedBy:id,name', 'sede:id,nombre,codigo']),
            'sesion_sede' => $sesionSede?->load(['openedBy:id,name', 'sede:id,nombre,codigo']),
            'mi_sesion_otra_sede' => ($miSesion !== null && $sedeId !== '' && (string) $miSesion->sede_id !== $sedeId)
                ? $miSesion->load(['sede:id,nombre,codigo'])
                : null,
            'puede_abrir' => $puedeAbrir,
            'sesiones' => $sesiones,
            'egresos' => $egresos,
            'totales_sesion' => $totalesSesion,
            'sistema_efectivo' => $sistemaEfectivo,
            'motivos_egreso' => CajaEgreso::MOTIVOS,
            'medios' => Pago::MEDIOS,
            'billeteras' => CajaBilleteras::CODIGOS,
            'filters' => [
                'sede_id' => $sedeId !== '' ? $sedeId : null,
                'per_page' => $perPage,
            ],
            'stats' => [
                'sesiones' => $statsTotal,
                'abiertas' => $statsAbiertas,
                'cerradas' => $statsCerradas,
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
        ActiveSedeContext::assertAccessible((string) $cajaSesion->sede_id);

        $caja->reabrirSesion($cajaSesion);

        return back()->with('success', 'Sesión de caja reabierta.');
    }

    public function arqueo(CajaSesion $cajaSesion, CajaSesionArqueoService $arqueoService): JsonResponse
    {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $cajaSesion->sede_id);

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
        ActiveSedeContext::assertAccessible((string) $cajaSesion->sede_id);

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

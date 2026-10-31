<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\AreaCarta;
use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Services\Operacion\PedidoService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CocinaController extends Controller
{
    use ResolvesTenantId;

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $areaId = (string) $request->string('area_id', '');
        $vista = (string) $request->string('vista', 'cola');
        if (! in_array($vista, ['cola', 'listos', 'todos'], true)) {
            $vista = 'cola';
        }

        $areas = $sedeId === ''
            ? collect()
            : AreaCarta::query()
                ->where('sede_id', $sedeId)
                ->where('activa', true)
                ->orderBy('orden')
                ->orderBy('nombre')
                ->get(['id', 'nombre']);

        if ($areaId !== '' && ! $areas->contains('id', $areaId)) {
            $areaId = '';
        }

        $query = PedidoLinea::query()
            ->with([
                'pedido:id,numero,mesa_id,canal,estado,enviado_at,created_at',
                'pedido.mesa:id,codigo,nombre',
                'area:id,nombre',
            ])
            ->whereHas('pedido', function ($q) use ($sedeId): void {
                if ($sedeId === '') {
                    $q->whereRaw('1 = 0');

                    return;
                }
                $q->where('sede_id', $sedeId)
                    ->whereIn('estado', Pedido::ESTADOS_ACTIVOS);
            })
            ->orderBy('enviado_at')
            ->orderBy('created_at');

        if ($areaId !== '') {
            $query->where('area_id', $areaId);
        }

        match ($vista) {
            'cola' => $query->where('estado', PedidoLinea::ESTADO_EN_COLA),
            'listos' => $query->where('estado', PedidoLinea::ESTADO_LISTO),
            default => $query->whereIn('estado', PedidoLinea::ESTADOS_COCINA),
        };

        $lineas = $query->get();

        // Agrupar por pedido para el KDS
        $tickets = $lineas
            ->groupBy('pedido_id')
            ->map(function ($group) {
                /** @var PedidoLinea $first */
                $first = $group->first();
                $pedido = $first->pedido;

                return [
                    'pedido_id' => $pedido?->id,
                    'numero' => $pedido?->numero,
                    'canal' => $pedido?->canal,
                    'mesa' => $pedido?->mesa,
                    'enviado_at' => $pedido?->enviado_at,
                    'lineas' => $group->values(),
                ];
            })
            ->values();

        return Inertia::render('cocina/index', [
            'tickets' => $tickets,
            'areas' => $areas,
            'filters' => [
                'area_id' => $areaId !== '' ? $areaId : null,
                'vista' => $vista,
                'sede_id' => $sedeId !== '' ? $sedeId : null,
            ],
            'stats' => [
                'en_cola' => $sedeId === '' ? 0 : PedidoLinea::query()
                    ->where('estado', PedidoLinea::ESTADO_EN_COLA)
                    ->whereHas('pedido', fn ($q) => $q->where('sede_id', $sedeId)->whereIn('estado', Pedido::ESTADOS_ACTIVOS))
                    ->when($areaId !== '', fn ($q) => $q->where('area_id', $areaId))
                    ->count(),
                'listos' => $sedeId === '' ? 0 : PedidoLinea::query()
                    ->where('estado', PedidoLinea::ESTADO_LISTO)
                    ->whereHas('pedido', fn ($q) => $q->where('sede_id', $sedeId)->whereIn('estado', Pedido::ESTADOS_ACTIVOS))
                    ->when($areaId !== '', fn ($q) => $q->where('area_id', $areaId))
                    ->count(),
            ],
        ]);
    }

    public function marcarListo(PedidoLinea $linea, PedidoService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();

        $linea->load('pedido');
        if ($linea->pedido === null) {
            abort(404);
        }

        ActiveSedeContext::assertAccessible((string) $linea->pedido->sede_id);
        $service->marcarLineaListo($linea);

        return back()->with('success', 'Ítem marcado como listo.');
    }
}

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

        $parseDate = static function (string $value): string {
            $value = trim($value);

            return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 ? $value : '';
        };

        $desde = $parseDate((string) $request->string('desde', ''));
        $hasta = $parseDate((string) $request->string('hasta', ''));

        // Sin rango → siempre hoy (igual que Pedidos).
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

        $applySedeYFecha = function ($q) use ($sedeId, $desde, $hasta): void {
            if ($sedeId === '') {
                $q->whereRaw('1 = 0');

                return;
            }
            $q->where('sede_id', $sedeId)
                ->whereIn('estado', Pedido::ESTADOS_ACTIVOS);
        };

        $applyFechaLinea = function ($q) use ($desde, $hasta): void {
            // Por fecha de envío a cocina (o creación si aún no hay enviado_at).
            $q->where(function ($inner) use ($desde, $hasta): void {
                $inner->where(function ($sent) use ($desde, $hasta): void {
                    $sent->whereNotNull('enviado_at')
                        ->whereDate('enviado_at', '>=', $desde)
                        ->whereDate('enviado_at', '<=', $hasta);
                })->orWhere(function ($created) use ($desde, $hasta): void {
                    $created->whereNull('enviado_at')
                        ->whereDate('created_at', '>=', $desde)
                        ->whereDate('created_at', '<=', $hasta);
                });
            });
        };

        $query = PedidoLinea::query()
            ->with([
                'pedido:id,numero,mesa_id,canal,estado,enviado_at,created_at',
                'pedido.mesa:id,codigo,nombre',
                'area:id,nombre',
            ])
            ->whereHas('pedido', $applySedeYFecha)
            ->orderBy('enviado_at')
            ->orderBy('created_at');

        $applyFechaLinea($query);

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

        $statsBase = function (string $estado) use ($sedeId, $areaId, $applySedeYFecha, $applyFechaLinea) {
            if ($sedeId === '') {
                return 0;
            }

            $q = PedidoLinea::query()
                ->where('estado', $estado)
                ->whereHas('pedido', $applySedeYFecha)
                ->when($areaId !== '', fn ($inner) => $inner->where('area_id', $areaId));

            $applyFechaLinea($q);

            return $q->count();
        };

        return Inertia::render('cocina/index', [
            'tickets' => $tickets,
            'areas' => $areas,
            'filters' => [
                'area_id' => $areaId !== '' ? $areaId : null,
                'vista' => $vista,
                'desde' => $desde,
                'hasta' => $hasta,
                'sede_id' => $sedeId !== '' ? $sedeId : null,
            ],
            'stats' => [
                'en_cola' => $statsBase(PedidoLinea::ESTADO_EN_COLA),
                'listos' => $statsBase(PedidoLinea::ESTADO_LISTO),
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

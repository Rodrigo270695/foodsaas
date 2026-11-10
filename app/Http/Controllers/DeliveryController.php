<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Services\Operacion\PedidoService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeliveryController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';
        $estado = (string) $request->string('estado', 'activos');
        if (! in_array($estado, ['activos', 'historico', 'todos'], true)) {
            $estado = 'activos';
        }

        $query = Pedido::query()
            ->with(['openedBy:id,name'])
            ->withCount([
                'lineas as lineas_pendientes_count' => fn ($q) => $q->where('estado', PedidoLinea::ESTADO_PENDIENTE),
                'lineas as lineas_cola_count' => fn ($q) => $q->where('estado', PedidoLinea::ESTADO_EN_COLA),
            ])
            ->where('canal', Pedido::CANAL_DELIVERY)
            ->orderByDesc('created_at');

        if ($sedeId !== '') {
            $query->where('sede_id', $sedeId);
        } else {
            $query->whereRaw('1 = 0');
        }

        match ($estado) {
            'activos' => $query->whereIn('estado', Pedido::ESTADOS_ACTIVOS),
            'historico' => $query->whereIn('estado', [Pedido::ESTADO_CERRADO, Pedido::ESTADO_ANULADO]),
            default => null,
        };

        $pedidos = $query->limit(100)->get()->map(fn (Pedido $p) => [
            'id' => $p->id,
            'numero' => $p->numero,
            'estado' => $p->estado,
            'comensales' => $p->comensales,
            'notas' => $p->notas,
            'total' => $p->total,
            'lineas_pendientes_count' => $p->lineas_pendientes_count,
            'lineas_cola_count' => $p->lineas_cola_count,
            'opened_by' => $p->openedBy?->name,
            'created_at' => $p->created_at?->toIso8601String(),
            'updated_at' => $p->updated_at?->toIso8601String(),
        ]);

        return Inertia::render('delivery/index', [
            'pedidos' => $pedidos,
            'filters' => [
                'estado' => $estado,
            ],
            'stats' => [
                'activos' => Pedido::query()
                    ->when($sedeId !== '', fn ($q) => $q->where('sede_id', $sedeId))
                    ->where('canal', Pedido::CANAL_DELIVERY)
                    ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
                    ->count(),
                'hoy' => Pedido::query()
                    ->when($sedeId !== '', fn ($q) => $q->where('sede_id', $sedeId))
                    ->where('canal', Pedido::CANAL_DELIVERY)
                    ->whereDate('created_at', now()->toDateString())
                    ->count(),
            ],
        ]);
    }

    public function store(Request $request, PedidoService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $data = $request->validate([
            'comensales' => ['nullable', 'integer', 'min:1', 'max:99'],
            'notas' => ['nullable', 'string', 'max:500'],
            'cliente_nombre' => ['nullable', 'string', 'max:180'],
        ]);

        $notas = trim((string) ($data['notas'] ?? ''));
        $cliente = trim((string) ($data['cliente_nombre'] ?? ''));
        if ($cliente !== '') {
            $notas = $notas !== ''
                ? "Cliente: {$cliente}. {$notas}"
                : "Cliente: {$cliente}";
        }

        $pedido = $service->abrir($sedeId, [
            'canal' => Pedido::CANAL_DELIVERY,
            'comensales' => max(1, (int) ($data['comensales'] ?? 1)),
            'notas' => $notas !== '' ? $notas : null,
        ]);

        return redirect()
            ->route('pedidos.show', $pedido)
            ->with('success', 'Pedido delivery #'.$pedido->numero.' abierto.');
    }
}

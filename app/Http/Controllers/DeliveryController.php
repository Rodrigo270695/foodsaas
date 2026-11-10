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

    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50];

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';

        $estado = (string) $request->string('estado', 'activos');
        if (! in_array($estado, ['activos', 'historico', 'todos'], true)) {
            $estado = 'activos';
        }

        [$desde, $hasta] = $this->resolveRange($request);
        $search = trim((string) $request->string('search', ''));
        $perPage = (int) $request->integer('per_page', 15);
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 15;
        }

        $base = Pedido::query()
            ->where('canal', Pedido::CANAL_DELIVERY)
            ->when($sedeId !== '', fn ($q) => $q->where('sede_id', $sedeId), fn ($q) => $q->whereRaw('1 = 0'));

        $query = (clone $base)
            ->with(['openedBy:id,name'])
            ->withCount([
                'lineas as lineas_pendientes_count' => fn ($q) => $q->where('estado', PedidoLinea::ESTADO_PENDIENTE),
                'lineas as lineas_cola_count' => fn ($q) => $q->where('estado', PedidoLinea::ESTADO_EN_COLA),
            ])
            ->orderByDesc('created_at');

        match ($estado) {
            'activos' => $query->whereIn('estado', Pedido::ESTADOS_ACTIVOS),
            'historico' => $query->whereIn('estado', [Pedido::ESTADO_CERRADO, Pedido::ESTADO_ANULADO]),
            default => null,
        };

        if ($desde !== '') {
            $query->whereDate('created_at', '>=', $desde);
        }
        if ($hasta !== '') {
            $query->whereDate('created_at', '<=', $hasta);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                if (ctype_digit($search)) {
                    $q->orWhere('numero', (int) $search);
                }
                $q->orWhere('notas', 'ilike', "%{$search}%");
            });
        }

        $pedidos = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Pedido $p) => [
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

        $hoy = now()->toDateString();
        $activosCount = (clone $base)->whereIn('estado', Pedido::ESTADOS_ACTIVOS)->count();
        $hoyCount = (clone $base)->whereDate('created_at', $hoy)->count();

        $activeFilters = 0;
        if ($estado !== 'activos') {
            $activeFilters++;
        }
        if ($search !== '') {
            $activeFilters++;
        }
        if ($desde !== $hoy || $hasta !== $hoy) {
            $activeFilters++;
        }

        return Inertia::render('delivery/index', [
            'pedidos' => $pedidos,
            'filters' => [
                'search' => $search,
                'estado' => $estado,
                'desde' => $desde,
                'hasta' => $hasta,
                'per_page' => $perPage,
                'sort' => null,
                'direction' => null,
            ],
            'stats' => [
                'activos' => $activosCount,
                'hoy' => $hoyCount,
                'filtros' => $activeFilters,
                'coincidencias' => $pedidos->total(),
            ],
        ]);
    }

    public function store(Request $request, PedidoService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $data = $request->validate([
            'cliente_nombre' => ['required', 'string', 'max:180'],
            'comensales' => ['nullable', 'integer', 'min:1', 'max:99'],
            'notas' => ['nullable', 'string', 'max:500'],
        ]);

        $cliente = trim((string) $data['cliente_nombre']);
        $notasExtra = trim((string) ($data['notas'] ?? ''));
        $notas = $notasExtra !== ''
            ? "Cliente: {$cliente}. {$notasExtra}"
            : "Cliente: {$cliente}";

        $pedido = $service->abrir($sedeId, [
            'canal' => Pedido::CANAL_DELIVERY,
            'comensales' => max(1, (int) ($data['comensales'] ?? 1)),
            'notas' => $notas,
        ]);

        return redirect()
            ->route('pedidos.show', $pedido)
            ->with('success', 'Pedido delivery #'.$pedido->numero.' abierto.');
    }

    /**
     * @return array{0: string, 1: string}
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
            return [$hoy, $hoy];
        }
        if ($desde === '') {
            $desde = $hasta;
        }
        if ($hasta === '') {
            $hasta = $desde;
        }
        if ($desde > $hasta) {
            [$desde, $hasta] = [$hasta, $desde];
        }

        return [$desde, $hasta];
    }
}

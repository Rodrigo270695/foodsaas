<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\DeliveryZona;
use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Services\Operacion\PedidoService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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
            ->with(['openedBy:id,name', 'deliveryZona:id,nombre,tarifa'])
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
                $q->orWhere('notas', 'ilike', "%{$search}%")
                    ->orWhere('delivery_nombre', 'ilike', "%{$search}%")
                    ->orWhere('delivery_telefono', 'ilike', "%{$search}%")
                    ->orWhere('delivery_direccion', 'ilike', "%{$search}%");
            });
        }

        $pedidos = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Pedido $p) => [
                'id' => $p->id,
                'numero' => $p->numero,
                'estado' => $p->estado,
                'delivery_estado' => $p->delivery_estado,
                'delivery_nombre' => $p->delivery_nombre,
                'delivery_telefono' => $p->delivery_telefono,
                'delivery_direccion' => $p->delivery_direccion,
                'delivery_tarifa' => (float) $p->delivery_tarifa,
                'zona' => $p->deliveryZona?->nombre,
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
        $enCamino = (clone $base)
            ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
            ->where('delivery_estado', Pedido::DELIVERY_EN_CAMINO)
            ->count();

        $zonas = $sedeId === ''
            ? []
            : DeliveryZona::query()
                ->where('sede_id', $sedeId)
                ->orderBy('orden')
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'tarifa', 'activa', 'orden']);

        return Inertia::render('delivery/index', [
            'pedidos' => $pedidos,
            'zonas' => $zonas,
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
                'en_camino' => $enCamino,
                'filtros' => ($estado !== 'activos' ? 1 : 0) + ($search !== '' ? 1 : 0),
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
            'telefono' => ['nullable', 'string', 'max:40'],
            'direccion' => ['required', 'string', 'max:255'],
            'zona_id' => ['nullable', 'uuid', Rule::exists('cfg_delivery_zonas', 'id')],
            'comensales' => ['nullable', 'integer', 'min:1', 'max:99'],
            'notas' => ['nullable', 'string', 'max:500'],
        ]);

        $tarifa = 0.0;
        $zonaId = $data['zona_id'] ?? null;
        if (is_string($zonaId) && $zonaId !== '') {
            $zona = DeliveryZona::query()
                ->whereKey($zonaId)
                ->where('sede_id', $sedeId)
                ->where('activa', true)
                ->first();
            if ($zona === null) {
                return back()->withErrors(['zona_id' => 'Zona no válida.']);
            }
            $tarifa = (float) $zona->tarifa;
        }

        $cliente = trim((string) $data['cliente_nombre']);
        $telefono = trim((string) ($data['telefono'] ?? ''));
        $direccion = trim((string) $data['direccion']);
        $notasExtra = trim((string) ($data['notas'] ?? ''));

        $pedido = $service->abrir($sedeId, [
            'canal' => Pedido::CANAL_DELIVERY,
            'comensales' => max(1, (int) ($data['comensales'] ?? 1)),
            'notas' => $notasExtra !== '' ? mb_substr($notasExtra, 0, 500) : null,
            'delivery_nombre' => $cliente,
            'delivery_telefono' => $telefono,
            'delivery_direccion' => $direccion,
            'delivery_zona_id' => $zonaId,
            'delivery_tarifa' => $tarifa,
        ]);

        return redirect()
            ->route('pedidos.show', $pedido)
            ->with('success', 'Pedido delivery #'.$pedido->numero.' abierto.');
    }

    public function updateEstado(Request $request, Pedido $pedido): RedirectResponse
    {
        $this->tenantIdOrAbort();
        abort_unless($pedido->canal === Pedido::CANAL_DELIVERY, 404);
        ActiveSedeContext::assertAccessible((string) $pedido->sede_id);

        $data = $request->validate([
            'delivery_estado' => ['required', 'string', Rule::in(Pedido::DELIVERY_ESTADOS)],
        ]);

        $pedido->delivery_estado = $data['delivery_estado'];
        $pedido->save();

        return back()->with('success', 'Estado delivery actualizado.');
    }

    public function storeZona(Request $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:120'],
            'tarifa' => ['required', 'numeric', 'min:0'],
            'activa' => ['sometimes', 'boolean'],
        ]);

        DeliveryZona::query()->create([
            'sede_id' => $sedeId,
            'nombre' => trim((string) $data['nombre']),
            'tarifa' => round((float) $data['tarifa'], 2),
            'activa' => $request->boolean('activa', true),
            'orden' => ((int) DeliveryZona::query()->where('sede_id', $sedeId)->max('orden')) + 1,
        ]);

        return back()->with('success', 'Zona de delivery creada.');
    }

    public function destroyZona(DeliveryZona $zona): RedirectResponse
    {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $zona->sede_id);
        $zona->delete();

        return back()->with('success', 'Zona eliminada.');
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

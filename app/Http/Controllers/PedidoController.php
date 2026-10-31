<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\AreaCarta;
use App\Models\CategoriaCarta;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Models\ProductoCarta;
use App\Services\Operacion\PedidoService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PedidoController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $estado = (string) $request->string('estado', 'activos');
        if (! in_array($estado, ['activos', 'historico', 'cerrados', 'anulados', 'todos'], true)) {
            $estado = 'activos';
        }

        $parseDate = static function (string $value): string {
            $value = trim($value);

            return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 ? $value : '';
        };

        $desde = $parseDate((string) $request->string('desde', ''));
        $hasta = $parseDate((string) $request->string('hasta', ''));

        // Compatibilidad con filtro antiguo `fecha` (un solo día).
        $fechaLegacy = $parseDate((string) $request->string('fecha', ''));
        if ($desde === '' && $hasta === '' && $fechaLegacy !== '') {
            $desde = $fechaLegacy;
            $hasta = $fechaLegacy;
        }

        // Sin rango → siempre hoy (Activos, Histórico, etc.).
        $hoyDefault = now()->toDateString();
        if ($desde === '' && $hasta === '') {
            $desde = $hoyDefault;
            $hasta = $hoyDefault;
        } elseif ($desde === '') {
            $desde = $hasta;
        } elseif ($hasta === '') {
            $hasta = $desde;
        }

        if ($desde !== '' && $hasta !== '' && $desde > $hasta) {
            [$desde, $hasta] = [$hasta, $desde];
        }

        $query = Pedido::query()
            ->with(['mesa:id,codigo,nombre', 'openedBy:id,name'])
            ->withCount([
                'lineas as lineas_pendientes_count' => fn ($q) => $q->where('estado', PedidoLinea::ESTADO_PENDIENTE),
                'lineas as lineas_cola_count' => fn ($q) => $q->where('estado', PedidoLinea::ESTADO_EN_COLA),
            ])
            ->orderByDesc('created_at');

        if ($sedeId !== '') {
            $query->where('sede_id', $sedeId);
        } else {
            $query->whereRaw('1 = 0');
        }

        match ($estado) {
            'activos' => $query->whereIn('estado', Pedido::ESTADOS_ACTIVOS),
            'historico' => $query->whereIn('estado', [Pedido::ESTADO_CERRADO, Pedido::ESTADO_ANULADO]),
            'cerrados' => $query->where('estado', Pedido::ESTADO_CERRADO),
            'anulados' => $query->where('estado', Pedido::ESTADO_ANULADO),
            default => null,
        };

        if ($desde !== '') {
            $query->whereDate('created_at', '>=', $desde);
        }
        if ($hasta !== '') {
            $query->whereDate('created_at', '<=', $hasta);
        }

        $pedidos = $query->paginate((int) $request->integer('per_page', 20))->withQueryString();

        $mesasLibres = $sedeId === ''
            ? collect()
            : Mesa::query()
                ->where('sede_id', $sedeId)
                ->where('activa', true)
                ->whereDoesntHave('pedidos', fn ($q) => $q->whereIn('estado', Pedido::ESTADOS_ACTIVOS))
                ->orderBy('codigo')
                ->get(['id', 'codigo', 'nombre', 'capacidad']);

        $hoy = now()->toDateString();

        return Inertia::render('pedidos/index', [
            'pedidos' => $pedidos,
            'mesas_libres' => $mesasLibres,
            'filters' => [
                'estado' => $estado,
                'desde' => $desde !== '' ? $desde : null,
                'hasta' => $hasta !== '' ? $hasta : null,
                'sede_id' => $sedeId !== '' ? $sedeId : null,
            ],
            'stats' => [
                'activos' => $sedeId === '' ? 0 : Pedido::query()->where('sede_id', $sedeId)->whereIn('estado', Pedido::ESTADOS_ACTIVOS)->count(),
                'en_cola' => $sedeId === '' ? 0 : PedidoLinea::query()
                    ->where('estado', PedidoLinea::ESTADO_EN_COLA)
                    ->whereHas('pedido', fn ($q) => $q->where('sede_id', $sedeId)->whereIn('estado', Pedido::ESTADOS_ACTIVOS))
                    ->count(),
                'cerrados_hoy' => $sedeId === '' ? 0 : Pedido::query()
                    ->where('sede_id', $sedeId)
                    ->where('estado', Pedido::ESTADO_CERRADO)
                    ->whereDate('created_at', $hoy)
                    ->count(),
            ],
        ]);
    }

    public function store(Request $request, PedidoService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $request->merge([
            'mesa_id' => $request->filled('mesa_id') ? $request->input('mesa_id') : null,
            'notas' => $request->filled('notas') ? $request->input('notas') : null,
        ]);

        $data = $request->validate([
            'canal' => ['required', Rule::in([Pedido::CANAL_SALON, Pedido::CANAL_MOSTRADOR, Pedido::CANAL_DELIVERY])],
            'mesa_id' => [
                'nullable',
                'uuid',
                Rule::exists('cfg_mesas', 'id')->where(fn ($q) => $q->where('sede_id', $sedeId)),
            ],
            'comensales' => ['nullable', 'integer', 'min:1', 'max:99'],
            'notas' => ['nullable', 'string', 'max:500'],
        ]);

        $pedido = $service->abrir($sedeId, $data);

        return redirect()
            ->route('pedidos.show', $pedido)
            ->with('success', 'Pedido #'.$pedido->numero.' abierto.');
    }

    public function show(Pedido $pedido): Response
    {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $pedido->sede_id);

        $pedido->load([
            'mesa:id,codigo,nombre,capacidad',
            'lineas.area:id,nombre',
            'lineas.producto:id,nombre,control_inventario',
            'openedBy:id,name',
            'venta.pagos',
        ]);

        $productos = ProductoCarta::query()
            ->where('sede_id', $pedido->sede_id)
            ->where('activo', true)
            ->with(['categoria:id,nombre', 'area:id,nombre'])
            ->orderBy('orden')
            ->orderBy('nombre')
            ->get([
                'id',
                'categoria_id',
                'area_id',
                'nombre',
                'precio',
                'control_inventario',
                'stock',
                'imagen_path',
            ]);

        $categorias = CategoriaCarta::query()
            ->where('sede_id', $pedido->sede_id)
            ->where('activa', true)
            ->orderBy('orden')
            ->orderBy('nombre')
            ->get(['id', 'nombre']);

        return Inertia::render('pedidos/show', [
            'pedido' => $pedido,
            'productos' => $productos,
            'categorias' => $categorias,
            'areas' => AreaCarta::query()
                ->where('sede_id', $pedido->sede_id)
                ->where('activa', true)
                ->orderBy('orden')
                ->get(['id', 'nombre']),
        ]);
    }

    public function storeLinea(Request $request, Pedido $pedido, PedidoService $service): RedirectResponse
    {
        $this->assertPedidoAccessible($pedido);

        $data = $request->validate([
            'producto_id' => [
                'required',
                'uuid',
                Rule::exists('cat_productos', 'id')->where(
                    fn ($q) => $q->where('sede_id', $pedido->sede_id)->where('activo', true),
                ),
            ],
            'cantidad' => ['required', 'numeric', 'min:0.001', 'max:999'],
            'notas' => ['nullable', 'string', 'max:255'],
        ]);

        $service->agregarLinea($pedido, $data);

        return back()->with('success', 'Ítem agregado al pedido.');
    }

    public function updateLinea(
        Request $request,
        Pedido $pedido,
        PedidoLinea $linea,
        PedidoService $service,
    ): RedirectResponse {
        $this->assertPedidoAccessible($pedido);
        $this->assertLineaDelPedido($pedido, $linea);

        $data = $request->validate([
            'cantidad' => ['sometimes', 'numeric', 'min:0.001', 'max:999'],
            'notas' => ['nullable', 'string', 'max:255'],
        ]);

        $service->actualizarLinea($linea, $data);

        return back()->with('success', 'Ítem actualizado.');
    }

    public function destroyLinea(
        Pedido $pedido,
        PedidoLinea $linea,
        PedidoService $service,
    ): RedirectResponse {
        $this->assertPedidoAccessible($pedido);
        $this->assertLineaDelPedido($pedido, $linea);

        $service->anularLinea($linea);

        return back()->with('success', 'Ítem anulado.');
    }

    public function enviar(Request $request, Pedido $pedido, PedidoService $service): RedirectResponse
    {
        $this->assertPedidoAccessible($pedido);

        $data = $request->validate([
            'linea_ids' => ['nullable', 'array'],
            'linea_ids.*' => ['uuid'],
        ]);

        $count = $service->enviarACocina(
            $pedido,
            isset($data['linea_ids']) ? array_values($data['linea_ids']) : null,
        );

        return back()->with('success', $count === 1
            ? '1 ítem enviado a cocina.'
            : "{$count} ítems enviados a cocina.");
    }

    public function anular(Pedido $pedido, PedidoService $service): RedirectResponse
    {
        $this->assertPedidoAccessible($pedido);
        $service->anularPedido($pedido);

        return redirect()
            ->route('pedidos.index')
            ->with('success', 'Pedido anulado.');
    }

    private function assertPedidoAccessible(Pedido $pedido): void
    {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $pedido->sede_id);
    }

    private function assertLineaDelPedido(Pedido $pedido, PedidoLinea $linea): void
    {
        if ($linea->pedido_id !== $pedido->id) {
            abort(404);
        }
    }
}

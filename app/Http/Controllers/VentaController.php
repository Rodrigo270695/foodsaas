<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\Pago;
use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Models\ProductoCarta;
use App\Models\Venta;
use App\Services\Operacion\CajaService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class VentaController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    public function index(Request $request, CajaService $caja): Response
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $sesion = $sedeId === '' ? null : $caja->sesionAbierta($sedeId);

        $search = trim((string) $request->query('search', ''));
        $estado = (string) $request->query('estado', 'todos');
        $medio = (string) $request->query('medio', 'todos');
        $tipo = (string) $request->query('tipo', 'todos');
        $fecha = trim((string) $request->query('fecha', ''));
        $perPage = min(100, max(10, (int) $request->query('per_page', 25)));
        $sort = (string) $request->query('sort', 'created_at');
        $direction = strtolower((string) $request->query('direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSort = ['created_at', 'total', 'numero', 'estado'];
        if (! in_array($sort, $allowedSort, true)) {
            $sort = 'created_at';
        }

        if ($fecha === '') {
            $fecha = now()->toDateString();
        }

        $pendientesCount = 0;
        $ventasQuery = Venta::query()->whereRaw('1 = 0');

        if ($sedeId !== '') {
            $pendientesCount = Pedido::query()
                ->where('sede_id', $sedeId)
                ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
                ->where('total', '>', 0)
                ->whereHas('lineas', fn ($q) => $q->whereIn('estado', [
                    PedidoLinea::ESTADO_EN_COLA,
                    PedidoLinea::ESTADO_LISTO,
                ]))
                ->count();

            $ventasQuery = Venta::query()
                ->with([
                    'pedido:id,numero,canal,mesa_id',
                    'pedido.mesa:id,codigo,nombre',
                    'sede:id,nombre,codigo',
                    'pagos',
                    'createdBy:id,name',
                ])
                ->where('sede_id', $sedeId)
                ->whereDate('created_at', $fecha);

            if ($estado === 'pagada' || $estado === 'anulada') {
                $ventasQuery->where('estado', $estado);
            }

            if ($tipo !== 'todos' && in_array($tipo, Venta::TIPOS_COMPROBANTE, true)) {
                $ventasQuery->where('tipo_comprobante', $tipo);
            }

            if ($medio !== 'todos' && in_array($medio, Pago::MEDIOS, true)) {
                $ventasQuery->whereHas('pagos', fn ($q) => $q->where('medio', $medio));
            }

            if ($search !== '') {
                $ventasQuery->where(function ($q) use ($search): void {
                    $q->where('numero', 'ilike', '%'.$search.'%')
                        ->orWhere('cliente_nombre', 'ilike', '%'.$search.'%')
                        ->orWhere('cliente_documento', 'ilike', '%'.$search.'%');

                    if (ctype_digit(ltrim($search, '#'))) {
                        $num = (int) ltrim($search, '#');
                        $q->orWhereHas('pedido', fn ($pq) => $pq->where('numero', $num));
                    }
                });
            }
        }

        $statsBase = (clone $ventasQuery);
        $stats = [
            'pendientes' => $pendientesCount,
            'monto_total' => round((float) (clone $statsBase)->where('estado', Venta::ESTADO_PAGADA)->sum('total'), 2),
            'ventas' => (clone $statsBase)->count(),
            'pagadas' => (clone $statsBase)->where('estado', Venta::ESTADO_PAGADA)->count(),
            'anuladas' => (clone $statsBase)->where('estado', Venta::ESTADO_ANULADA)->count(),
            'coincidencias' => 0,
        ];

        $ventas = $ventasQuery
            ->orderBy($sort, $direction)
            ->paginate($perPage)
            ->withQueryString();

        $stats['coincidencias'] = $ventas->total();

        return Inertia::render('ventas/index', [
            'sesion_abierta' => $sesion !== null,
            'ventas' => $ventas,
            'medios' => Pago::MEDIOS,
            'tipos_comprobante' => Venta::TIPOS_COMPROBANTE,
            'filters' => [
                'sede_id' => $sedeId !== '' ? $sedeId : null,
                'search' => $search,
                'estado' => $estado,
                'medio' => $medio,
                'tipo' => $tipo,
                'fecha' => $fecha,
                'per_page' => $perPage,
                'sort' => $sort,
                'direction' => $direction,
            ],
            'stats' => $stats,
        ]);
    }

    public function pendientes(CajaService $caja): Response
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $sesion = $sedeId === '' ? null : $caja->sesionAbierta($sedeId);

        $pedidosPendientes = $sedeId === ''
            ? collect()
            : Pedido::query()
                ->with(['mesa:id,codigo,nombre', 'openedBy:id,name'])
                ->where('sede_id', $sedeId)
                ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
                ->where('total', '>', 0)
                ->whereHas('lineas', fn ($q) => $q->whereIn('estado', [
                    PedidoLinea::ESTADO_EN_COLA,
                    PedidoLinea::ESTADO_LISTO,
                ]))
                ->orderByDesc('updated_at')
                ->get(['id', 'numero', 'mesa_id', 'canal', 'estado', 'total', 'subtotal', 'descuento', 'opened_by', 'updated_at']);

        return Inertia::render('ventas/pendientes', [
            'sesion_abierta' => $sesion !== null,
            'pedidos_pendientes' => $pedidosPendientes,
            'stats' => [
                'pendientes' => $pedidosPendientes->count(),
            ],
        ]);
    }

    public function create(CajaService $caja): Response
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $sesion = $sedeId === '' ? null : $caja->sesionAbierta($sedeId);

        $productos = $sedeId === ''
            ? collect()
            : ProductoCarta::query()
                ->with(['categoria:id,nombre'])
                ->where('sede_id', $sedeId)
                ->where('activo', true)
                ->orderBy('orden')
                ->orderBy('nombre')
                ->get([
                    'id',
                    'categoria_id',
                    'nombre',
                    'codigo',
                    'precio',
                    'imagen_path',
                    'control_inventario',
                    'stock',
                ]);

        $sedePayload = collect(ActiveSedeContext::accessibleCatalog())
            ->firstWhere('id', $sedeId);

        return Inertia::render('ventas/nueva', [
            'sesion_abierta' => $sesion !== null,
            'productos' => $productos,
            'medios' => Pago::MEDIOS,
            'tipos_comprobante' => Venta::TIPOS_COMPROBANTE,
            'sede' => $sedePayload,
        ]);
    }

    public function store(Request $request, CajaService $caja): RedirectResponse
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        if ($sedeId === '') {
            return redirect()
                ->route('ventas.index')
                ->with('error', 'Selecciona una sede activa.');
        }

        $data = $request->validate([
            'tipo_comprobante' => ['required', Rule::in(Venta::TIPOS_COMPROBANTE)],
            'cliente_nombre' => ['nullable', 'string', 'max:180'],
            'cliente_documento' => ['nullable', 'string', 'max:20'],
            'descuento' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.producto_id' => ['required', 'uuid'],
            'items.*.cantidad' => ['required', 'numeric', 'min:0.001'],
            'pagos' => ['required', 'array', 'min:1'],
            'pagos.*.medio' => ['required', Rule::in(Pago::MEDIOS)],
            'pagos.*.monto' => ['required', 'numeric', 'min:0.01'],
            'pagos.*.referencia' => ['nullable', 'string', 'max:120'],
        ]);

        $venta = $caja->registrarVentaRapida($sedeId, $data);

        return redirect()
            ->route('ventas.index')
            ->with('success', 'Venta '.$venta->numero.' registrada por S/ '.number_format((float) $venta->total, 2));
    }

    public function cobrarForm(Pedido $pedido, CajaService $caja): Response
    {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $pedido->sede_id);

        $pedido->load([
            'mesa:id,codigo,nombre',
            'openedBy:id,name',
            'lineas' => fn ($q) => $q->whereIn('estado', [
                PedidoLinea::ESTADO_EN_COLA,
                PedidoLinea::ESTADO_LISTO,
                PedidoLinea::ESTADO_PENDIENTE,
            ]),
        ]);

        $sesion = $caja->sesionAbierta((string) $pedido->sede_id);

        return Inertia::render('ventas/cobrar', [
            'pedido' => $pedido,
            'sesion_abierta' => $sesion !== null,
            'medios' => Pago::MEDIOS,
        ]);
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
            ->route('ventas.index')
            ->with('success', 'Venta registrada por S/ '.number_format((float) $venta->total, 2));
    }
}

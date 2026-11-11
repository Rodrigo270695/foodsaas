<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\Compra;
use App\Models\CompraLinea;
use App\Models\Insumo;
use App\Models\ProductoCarta;
use App\Models\Proveedor;
use App\Services\Inventario\CompraRecepcionService;
use App\Services\Inventario\CompraSyncService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CompraController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50];

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';

        $search = trim((string) $request->string('search', ''));
        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, ['todos', ...Compra::ESTADOS], true)) {
            $estado = 'todos';
        }

        $perPage = (int) $request->integer('per_page', 15);
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 15;
        }

        $query = Compra::query()
            ->with(['proveedor:id,nombre'])
            ->withCount('lineas')
            ->orderByDesc('fecha')
            ->orderByDesc('numero');

        if ($sedeId !== '') {
            $query->where('sede_id', $sedeId);
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($estado !== 'todos') {
            $query->where('estado', $estado);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                if (ctype_digit($search)) {
                    $q->where('numero', (int) $search);
                }
                $q->orWhere('notas', 'ilike', "%{$search}%")
                    ->orWhereHas('proveedor', fn ($pq) => $pq->where('nombre', 'ilike', "%{$search}%"));
            });
        }

        $compras = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Compra $c) => $this->serializeList($c));

        $base = Compra::query()->when(
            $sedeId !== '',
            fn ($q) => $q->where('sede_id', $sedeId),
            fn ($q) => $q->whereRaw('1 = 0'),
        );

        return Inertia::render('compras/index', [
            'compras' => $compras,
            'filters' => [
                'search' => $search,
                'estado' => $estado,
                'per_page' => $perPage,
                'sort' => null,
                'direction' => null,
            ],
            'stats' => [
                'total' => (clone $base)->count(),
                'borrador' => (clone $base)->where('estado', Compra::ESTADO_BORRADOR)->count(),
                'abiertas' => (clone $base)->whereIn('estado', [
                    Compra::ESTADO_ENVIADA,
                    Compra::ESTADO_PARCIAL,
                ])->count(),
                'coincidencias' => $compras->total(),
            ],
        ]);
    }

    public function create(): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        return Inertia::render('compras/form', [
            'compra' => null,
            'catalog' => $this->catalog($sedeId),
        ]);
    }

    public function store(Request $request, CompraSyncService $sync): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();
        $data = $this->validated($request, $sedeId);

        $compra = $sync->create($sedeId, $data);

        return redirect()
            ->route('compras.show', $compra)
            ->with('success', 'Orden de compra creada.');
    }

    public function show(Compra $compra): Response
    {
        $this->tenantIdOrAbort();
        $this->assertAccessible($compra);

        $compra->load(['proveedor', 'lineas.insumo:id,nombre,unidad', 'lineas.producto:id,nombre']);

        return Inertia::render('compras/show', [
            'compra' => $this->serializeDetail($compra),
        ]);
    }

    public function edit(Compra $compra): Response|RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertAccessible($compra);

        if (! $compra->isEditable()) {
            return redirect()
                ->route('compras.show', $compra)
                ->with('error', 'Solo se editan órdenes en borrador.');
        }

        $sedeId = $this->activeSedeIdOrAbort();
        $compra->load(['lineas.insumo:id,nombre,unidad', 'lineas.producto:id,nombre']);

        return Inertia::render('compras/form', [
            'compra' => $this->serializeDetail($compra),
            'catalog' => $this->catalog($sedeId),
        ]);
    }

    public function update(Request $request, Compra $compra, CompraSyncService $sync): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertAccessible($compra);
        $sedeId = $this->activeSedeIdOrAbort();
        $data = $this->validated($request, $sedeId);

        $sync->update($compra, $data);

        return redirect()
            ->route('compras.show', $compra)
            ->with('success', 'Orden actualizada.');
    }

    public function destroy(Compra $compra): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertAccessible($compra);

        if (! $compra->isEditable()) {
            return back()->with('error', 'Solo se pueden eliminar borradores.');
        }

        $compra->delete();

        return redirect()
            ->route('compras.index')
            ->with('success', 'Orden eliminada.');
    }

    public function emitir(Compra $compra, CompraSyncService $sync): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertAccessible($compra);
        $sync->emitir($compra);

        return back()->with('success', 'Orden emitida.');
    }

    public function anular(Compra $compra, CompraSyncService $sync): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertAccessible($compra);
        $sync->anular($compra);

        return back()->with('success', 'Orden anulada.');
    }

    public function recibir(
        Request $request,
        Compra $compra,
        CompraRecepcionService $recepcion,
    ): RedirectResponse {
        $this->tenantIdOrAbort();
        $this->assertAccessible($compra);

        $data = $request->validate([
            'lineas' => ['required', 'array', 'min:1'],
            'lineas.*.linea_id' => ['required', 'uuid'],
            'lineas.*.cantidad' => ['required', 'numeric', 'min:0.001'],
        ]);

        $recepcion->recibir($compra, $data['lineas']);

        return back()->with('success', 'Recepción registrada.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, string $sedeId): array
    {
        $data = $request->validate([
            'proveedor_id' => [
                'nullable',
                'uuid',
                Rule::exists('log_proveedores', 'id'),
            ],
            'fecha' => ['required', 'date'],
            'notas' => ['nullable', 'string', 'max:500'],
            'lineas' => ['required', 'array', 'min:1'],
            'lineas.*.linea_tipo' => ['required', Rule::in(CompraLinea::TIPOS)],
            'lineas.*.insumo_id' => ['nullable', 'uuid', Rule::exists('inv_insumos', 'id')],
            'lineas.*.producto_id' => ['nullable', 'uuid', Rule::exists('cat_productos', 'id')],
            'lineas.*.cantidad' => ['required', 'numeric', 'min:0.001'],
            'lineas.*.costo_unitario' => ['required', 'numeric', 'min:0'],
            'lineas.*.unidad' => ['nullable', 'string', 'max:20'],
        ]);

        if (! empty($data['proveedor_id'])) {
            $ok = Proveedor::query()
                ->whereKey($data['proveedor_id'])
                ->where(fn ($q) => $q->whereNull('sede_id')->orWhere('sede_id', $sedeId))
                ->exists();
            if (! $ok) {
                abort(422, 'Proveedor no válido para la sede.');
            }
        }

        return [
            'proveedor_id' => $data['proveedor_id'] ?? null,
            'fecha' => (string) $data['fecha'],
            'notas' => isset($data['notas']) && trim((string) $data['notas']) !== ''
                ? trim((string) $data['notas'])
                : null,
            'lineas' => $data['lineas'],
        ];
    }

    /**
     * @return array{proveedores: list<array<string, mixed>>, insumos: list<array<string, mixed>>, productos: list<array<string, mixed>>}
     */
    private function catalog(string $sedeId): array
    {
        $proveedores = Proveedor::query()
            ->where('activo', true)
            ->where(fn ($q) => $q->whereNull('sede_id')->orWhere('sede_id', $sedeId))
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'ruc'])
            ->map(fn (Proveedor $p) => [
                'id' => $p->id,
                'nombre' => $p->nombre,
                'ruc' => $p->ruc,
            ])
            ->all();

        $insumos = Insumo::query()
            ->where('activo', true)
            ->where(fn ($q) => $q->whereNull('sede_id')->orWhere('sede_id', $sedeId))
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'unidad', 'costo_unitario'])
            ->map(fn (Insumo $i) => [
                'id' => $i->id,
                'nombre' => $i->nombre,
                'unidad' => $i->unidad,
                'costo_unitario' => $i->costo_unitario,
            ])
            ->all();

        $productos = ProductoCarta::query()
            ->where('sede_id', $sedeId)
            ->where('activo', true)
            ->where('control_inventario', ProductoCarta::CONTROL_SKU)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'costo_unitario', 'stock'])
            ->map(fn (ProductoCarta $p) => [
                'id' => $p->id,
                'nombre' => $p->nombre,
                'costo_unitario' => $p->costo_unitario ?? '0',
                'stock' => $p->stock,
            ])
            ->all();

        return [
            'proveedores' => $proveedores,
            'insumos' => $insumos,
            'productos' => $productos,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeList(Compra $c): array
    {
        return [
            'id' => $c->id,
            'numero' => $c->numero,
            'estado' => $c->estado,
            'fecha' => $c->fecha?->toDateString(),
            'total' => $c->total,
            'lineas_count' => $c->lineas_count ?? $c->lineas()->count(),
            'proveedor' => $c->proveedor
                ? ['id' => $c->proveedor->id, 'nombre' => $c->proveedor->nombre]
                : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeDetail(Compra $c): array
    {
        return [
            'id' => $c->id,
            'numero' => $c->numero,
            'estado' => $c->estado,
            'fecha' => $c->fecha?->toDateString(),
            'notas' => $c->notas,
            'total' => $c->total,
            'proveedor_id' => $c->proveedor_id,
            'proveedor' => $c->proveedor
                ? [
                    'id' => $c->proveedor->id,
                    'nombre' => $c->proveedor->nombre,
                    'ruc' => $c->proveedor->ruc,
                ]
                : null,
            'can_emitir' => $c->canEmitir(),
            'can_recibir' => $c->canRecibir(),
            'can_anular' => $c->canAnular(),
            'can_edit' => $c->isEditable(),
            'lineas' => $c->lineas->map(fn (CompraLinea $l) => [
                'id' => $l->id,
                'linea_tipo' => $l->linea_tipo,
                'insumo_id' => $l->insumo_id,
                'producto_id' => $l->producto_id,
                'cantidad' => $l->cantidad,
                'cantidad_recibida' => $l->cantidad_recibida,
                'pendiente' => $l->pendiente(),
                'costo_unitario' => $l->costo_unitario,
                'unidad' => $l->unidad,
                'nombre' => $l->linea_tipo === CompraLinea::TIPO_INSUMO
                    ? ($l->insumo?->nombre ?? '—')
                    : ($l->producto?->nombre ?? '—'),
            ])->all(),
        ];
    }

    private function assertAccessible(Compra $compra): void
    {
        $sedeId = ActiveSedeContext::id();
        if ($sedeId === null || $compra->sede_id !== $sedeId) {
            abort(404);
        }
    }
}

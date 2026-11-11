<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\Insumo;
use App\Models\MovimientoInventario;
use App\Services\Inventario\InsumoKardexService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InsumoController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50];

    private const UNIDADES = ['und', 'g', 'kg', 'ml', 'l', 'oz', 'lb', 'pza'];

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';

        $search = trim((string) $request->string('search', ''));
        $estado = (string) $request->string('estado', 'activos');
        if (! in_array($estado, ['activos', 'inactivos', 'todos'], true)) {
            $estado = 'activos';
        }
        $alerta = (string) $request->string('alerta', 'todos');
        if (! in_array($alerta, ['todos', 'bajo', 'ok'], true)) {
            $alerta = 'todos';
        }

        $perPage = (int) $request->integer('per_page', 15);
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 15;
        }

        $query = Insumo::query()
            ->orderBy('nombre');

        if ($sedeId !== '') {
            $query->where(function ($q) use ($sedeId): void {
                $q->whereNull('sede_id')->orWhere('sede_id', $sedeId);
            });
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($estado === 'activos') {
            $query->where('activo', true);
        } elseif ($estado === 'inactivos') {
            $query->where('activo', false);
        }

        if ($search !== '') {
            $query->where('nombre', 'ilike', "%{$search}%");
        }

        if ($alerta === 'bajo') {
            $query->whereNotNull('stock_minimo')
                ->whereColumn('stock', '<=', 'stock_minimo');
        } elseif ($alerta === 'ok') {
            $query->where(function ($q): void {
                $q->whereNull('stock_minimo')
                    ->orWhereColumn('stock', '>', 'stock_minimo');
            });
        }

        $insumos = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Insumo $i) => $this->serialize($i));

        $base = Insumo::query()->when(
            $sedeId !== '',
            fn ($q) => $q->where(fn ($qq) => $qq->whereNull('sede_id')->orWhere('sede_id', $sedeId)),
            fn ($q) => $q->whereRaw('1 = 0'),
        );

        $stats = [
            'total' => (clone $base)->count(),
            'activos' => (clone $base)->where('activo', true)->count(),
            'bajo' => (clone $base)
                ->where('activo', true)
                ->whereNotNull('stock_minimo')
                ->whereColumn('stock', '<=', 'stock_minimo')
                ->count(),
            'filtros' => ($estado !== 'activos' ? 1 : 0)
                + ($alerta !== 'todos' ? 1 : 0)
                + ($search !== '' ? 1 : 0),
            'coincidencias' => $insumos->total(),
        ];

        return Inertia::render('insumos/index', [
            'insumos' => $insumos,
            'filters' => [
                'search' => $search,
                'estado' => $estado,
                'alerta' => $alerta,
                'per_page' => $perPage,
                'sort' => null,
                'direction' => null,
            ],
            'stats' => $stats,
            'unidades' => self::UNIDADES,
        ]);
    }

    public function store(Request $request, InsumoKardexService $kardex): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();
        $data = $this->validated($request);

        $stockInicial = (float) ($data['stock'] ?? 0);
        unset($data['stock']);

        $insumo = Insumo::query()->create([
            ...$data,
            'sede_id' => $sedeId,
            'stock' => 0,
        ]);

        if ($stockInicial > 0) {
            $kardex->registrar($insumo, [
                'tipo' => MovimientoInventario::TIPO_ENTRADA,
                'cantidad' => $stockInicial,
                'motivo' => 'Stock inicial',
                'referencia_tipo' => 'insumo',
                'referencia_id' => $insumo->id,
                'costo_unitario' => (float) $insumo->costo_unitario,
            ]);
        }

        return back()->with('success', 'Insumo creado.');
    }

    public function update(Request $request, Insumo $insumo): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertInsumoAccessible($insumo);

        $data = $this->validated($request, updating: true);
        unset($data['stock']); // stock solo vía kardex

        $insumo->update($data);

        return back()->with('success', 'Insumo actualizado.');
    }

    public function destroy(Insumo $insumo): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertInsumoAccessible($insumo);

        if ($insumo->recetaLineas()->exists()) {
            return back()->with('error', 'No se puede eliminar: el insumo está en una o más recetas.');
        }

        $insumo->delete();

        return back()->with('success', 'Insumo eliminado.');
    }

    public function storeMovimiento(
        Request $request,
        Insumo $insumo,
        InsumoKardexService $kardex,
    ): RedirectResponse {
        $this->tenantIdOrAbort();
        $this->assertInsumoAccessible($insumo);

        $data = $request->validate([
            'tipo' => ['required', Rule::in(MovimientoInventario::TIPOS)],
            'cantidad' => ['nullable', 'numeric', 'min:0.001'],
            'stock_nuevo' => ['nullable', 'numeric', 'min:0'],
            'motivo' => ['nullable', 'string', 'max:255'],
            'costo_unitario' => ['nullable', 'numeric', 'min:0'],
        ]);

        $kardex->registrar($insumo, $data);

        return back()->with('success', 'Movimiento de insumo registrado.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, bool $updating = false): array
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:180'],
            'unidad' => ['required', Rule::in(self::UNIDADES)],
            'stock' => [$updating ? 'nullable' : 'nullable', 'numeric', 'min:0'],
            'stock_minimo' => ['nullable', 'numeric', 'min:0'],
            'costo_unitario' => ['required', 'numeric', 'min:0'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        return [
            'nombre' => trim((string) $data['nombre']),
            'unidad' => (string) $data['unidad'],
            'stock' => $data['stock'] ?? 0,
            'stock_minimo' => array_key_exists('stock_minimo', $data) && $data['stock_minimo'] !== null && $data['stock_minimo'] !== ''
                ? (float) $data['stock_minimo']
                : null,
            'costo_unitario' => (float) $data['costo_unitario'],
            'activo' => array_key_exists('activo', $data) ? (bool) $data['activo'] : true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Insumo $i): array
    {
        return [
            'id' => $i->id,
            'nombre' => $i->nombre,
            'unidad' => $i->unidad,
            'stock' => $i->stock,
            'stock_minimo' => $i->stock_minimo,
            'costo_unitario' => $i->costo_unitario,
            'activo' => $i->activo,
            'bajo' => $i->stock_minimo !== null
                && (float) $i->stock <= (float) $i->stock_minimo,
        ];
    }

    private function assertInsumoAccessible(Insumo $insumo): void
    {
        $sedeId = ActiveSedeContext::id();
        if ($sedeId === null) {
            abort(404);
        }
        if ($insumo->sede_id !== null && $insumo->sede_id !== $sedeId) {
            abort(404);
        }
    }
}

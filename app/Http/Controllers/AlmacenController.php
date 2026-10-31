<?php

namespace App\Http\Controllers;

use App\Exports\AlmacenKardexXlsxExport;
use App\Exports\AlmacenMovimientosXlsxExport;
use App\Exports\AlmacenStockXlsxExport;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Http\Requests\MovimientoInventarioRequest;
use App\Models\MovimientoInventario;
use App\Models\ProductoCarta;
use App\Services\Inventario\KardexService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AlmacenController extends Controller
{
    use ResolvesTenantId;

    private const PER_PAGE_OPTIONS = [10, 12, 15, 20, 25, 50];

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';

        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 15);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true)
            ? $perPageRequested
            : 15;

        $control = (string) $request->string('control', 'sku');
        if (! in_array($control, ['sku', 'recipe', 'todos'], true)) {
            $control = 'sku';
        }

        $alerta = (string) $request->string('alerta', 'todos');
        if (! in_array($alerta, ['todos', 'bajo', 'ok'], true)) {
            $alerta = 'todos';
        }

        $query = ProductoCarta::query()
            ->with(['categoria:id,nombre'])
            ->whereIn('control_inventario', [
                ProductoCarta::CONTROL_SKU,
                ProductoCarta::CONTROL_RECIPE,
            ])
            ->orderBy('nombre');

        if ($sedeId !== '') {
            $query->where('sede_id', $sedeId);
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($control === 'sku') {
            $query->where('control_inventario', ProductoCarta::CONTROL_SKU);
        } elseif ($control === 'recipe') {
            $query->where('control_inventario', ProductoCarta::CONTROL_RECIPE);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('nombre', 'ilike', "%{$search}%")
                    ->orWhere('codigo', 'ilike', "%{$search}%");
            });
        }

        if ($alerta === 'bajo') {
            $query->where('control_inventario', ProductoCarta::CONTROL_SKU)
                ->whereNotNull('stock_minimo')
                ->whereColumn('stock', '<=', 'stock_minimo');
        } elseif ($alerta === 'ok') {
            $query->where('control_inventario', ProductoCarta::CONTROL_SKU)
                ->where(function ($q): void {
                    $q->whereNull('stock_minimo')
                        ->orWhereColumn('stock', '>', 'stock_minimo');
                });
        }

        $productos = $query->paginate($perPage)->withQueryString();

        $baseSku = ProductoCarta::query()
            ->where('control_inventario', ProductoCarta::CONTROL_SKU);
        $baseRecipe = ProductoCarta::query()
            ->where('control_inventario', ProductoCarta::CONTROL_RECIPE);
        if ($sedeId !== '') {
            $baseSku->where('sede_id', $sedeId);
            $baseRecipe->where('sede_id', $sedeId);
        } else {
            $baseSku->whereRaw('1 = 0');
            $baseRecipe->whereRaw('1 = 0');
        }

        $skuCount = (clone $baseSku)->count();
        $bajoCount = (clone $baseSku)
            ->whereNotNull('stock_minimo')
            ->whereColumn('stock', '<=', 'stock_minimo')
            ->count();

        return Inertia::render('almacen/index', [
            'productos' => $productos,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'control' => $control,
                'alerta' => $alerta,
            ],
            'stats' => [
                'sku' => $skuCount,
                'bajo' => $bajoCount,
                'recipe' => $baseRecipe->count(),
                'coincidencias' => $productos->total(),
            ],
        ]);
    }

    /**
     * Kardex general: todos los movimientos de la sede activa.
     */
    public function movimientos(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';

        $search = trim((string) $request->string('search', ''));
        $tipo = (string) $request->string('tipo', 'todos');
        if ($tipo !== 'todos' && ! in_array($tipo, MovimientoInventario::TIPOS, true)) {
            $tipo = 'todos';
        }

        $perPageRequested = (int) $request->integer('per_page', 20);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true)
            ? $perPageRequested
            : 20;

        $query = $this->movimientosQuery($sedeId, $search, $tipo);

        $movimientos = $query
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('almacen/movimientos', [
            'movimientos' => $movimientos,
            'filters' => [
                'search' => $search,
                'tipo' => $tipo,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => (clone $this->movimientosQuery($sedeId, '', 'todos'))->count(),
                'coincidencias' => $movimientos->total(),
            ],
        ]);
    }

    public function exportMovimientos(Request $request): StreamedResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';

        $search = trim((string) $request->string('search', ''));
        $tipo = (string) $request->string('tipo', 'todos');
        if ($tipo !== 'todos' && ! in_array($tipo, MovimientoInventario::TIPOS, true)) {
            $tipo = 'todos';
        }

        $exporter = new AlmacenMovimientosXlsxExport;

        return response()->streamDownload(
            fn () => $exporter->streamTo($this->movimientosQuery($sedeId, $search, $tipo)),
            'almacen-movimientos-'.now()->format('Y-m-d-His').'.xlsx',
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
        );
    }

    public function kardex(Request $request, ProductoCarta $productoCarta): Response
    {
        $this->tenantIdOrAbort();

        if (! in_array($productoCarta->control_inventario, [
            ProductoCarta::CONTROL_SKU,
            ProductoCarta::CONTROL_RECIPE,
        ], true)) {
            abort(404);
        }

        ActiveSedeContext::assertAccessible((string) $productoCarta->sede_id);

        $perPageRequested = (int) $request->integer('per_page', 20);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true)
            ? $perPageRequested
            : 20;

        $movimientos = MovimientoInventario::query()
            ->with(['user:id,name'])
            ->where('producto_id', $productoCarta->id)
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        $productoCarta->load(['categoria:id,nombre']);

        return Inertia::render('almacen/kardex', [
            'producto' => $productoCarta,
            'movimientos' => $movimientos,
            'filters' => [
                'per_page' => $perPage,
            ],
        ]);
    }

    public function storeMovimiento(
        MovimientoInventarioRequest $request,
        ProductoCarta $productoCarta,
        KardexService $kardex,
    ): RedirectResponse {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $productoCarta->sede_id);

        $kardex->registrar($productoCarta, $request->validated());

        return back()->with('success', 'Movimiento registrado correctamente.');
    }

    public function exportStock(Request $request): StreamedResponse
    {
        $this->tenantIdOrAbort();

        $search = trim((string) $request->string('search', ''));

        $sedeId = ActiveSedeContext::id() ?? '';

        $query = ProductoCarta::query()
            ->with(['categoria:id,nombre'])
            ->where('control_inventario', ProductoCarta::CONTROL_SKU)
            ->orderBy('nombre');

        if ($sedeId !== '') {
            $query->where('sede_id', $sedeId);
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('nombre', 'ilike', "%{$search}%")
                    ->orWhere('codigo', 'ilike', "%{$search}%");
            });
        }

        $exporter = new AlmacenStockXlsxExport;

        return response()->streamDownload(
            fn () => $exporter->streamTo($query),
            'almacen-stock-'.now()->format('Y-m-d-His').'.xlsx',
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
        );
    }

    public function exportKardex(Request $request, ProductoCarta $productoCarta): StreamedResponse
    {
        $this->tenantIdOrAbort();

        $query = MovimientoInventario::query()
            ->with(['user:id,name'])
            ->where('producto_id', $productoCarta->id)
            ->orderByDesc('created_at');

        $exporter = new AlmacenKardexXlsxExport($productoCarta);

        return response()->streamDownload(
            fn () => $exporter->streamTo($query),
            'kardex-'.\Illuminate\Support\Str::slug($productoCarta->nombre).'-'.now()->format('Y-m-d-His').'.xlsx',
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
        );
    }

    /**
     * @return Builder<MovimientoInventario>
     */
    private function movimientosQuery(string $sedeId, string $search, string $tipo): Builder
    {
        $query = MovimientoInventario::query()
            ->with([
                'user:id,name',
                'producto:id,nombre,codigo,sede_id',
            ])
            ->orderByDesc('created_at');

        if ($sedeId === '') {
            $query->whereRaw('1 = 0');

            return $query;
        }

        $query->whereHas('producto', function (Builder $q) use ($sedeId): void {
            $q->where('sede_id', $sedeId);
        });

        if ($tipo !== 'todos') {
            $query->where('tipo', $tipo);
        }

        if ($search !== '') {
            $query->where(function (Builder $q) use ($search): void {
                $q->where('motivo', 'ilike', "%{$search}%")
                    ->orWhereHas('producto', function (Builder $pq) use ($search): void {
                        $pq->where('nombre', 'ilike', "%{$search}%")
                            ->orWhere('codigo', 'ilike', "%{$search}%");
                    });
            });
        }

        return $query;
    }
}

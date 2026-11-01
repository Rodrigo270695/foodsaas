<?php

namespace App\Http\Controllers;

use App\Exports\CartaProductosXlsxExport;
use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Http\Requests\AreaCartaRequest;
use App\Http\Requests\CategoriaCartaRequest;
use App\Http\Requests\ProductoCartaRequest;
use App\Models\AreaCarta;
use App\Models\CategoriaCarta;
use App\Models\ProductoCarta;
use App\Services\Inventario\KardexService;
use App\Services\Sedes\CopyCartaToSedeService;
use App\Support\Plan\PlanLimits;
use App\Support\Sedes\ActiveSedeContext;
use App\Tenancy\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CartaController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    private const PER_PAGE_OPTIONS = [10, 12, 15, 20, 25, 50];

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';

        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 12);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true)
            ? $perPageRequested
            : 12;

        $categoriaId = (string) $request->string('categoria_id', '');
        $areaId = (string) $request->string('area_id', '');
        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, ['todos', 'activos', 'inactivos'], true)) {
            $estado = 'todos';
        }

        $categorias = $sedeId === ''
            ? collect()
            : CategoriaCarta::query()
                ->where('sede_id', $sedeId)
                ->withCount('productos')
                ->orderBy('orden')
                ->orderBy('nombre')
                ->get();

        $areas = $sedeId === ''
            ? collect()
            : AreaCarta::query()
                ->where('sede_id', $sedeId)
                ->withCount('productos')
                ->orderBy('orden')
                ->orderBy('nombre')
                ->get();

        $query = ProductoCarta::query()
            ->with([
                'categoria:id,nombre',
                'area:id,nombre',
            ])
            ->orderBy('orden')
            ->orderBy('nombre');

        if ($sedeId !== '') {
            $query->where('sede_id', $sedeId);
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('nombre', 'ilike', "%{$search}%")
                    ->orWhere('codigo', 'ilike', "%{$search}%")
                    ->orWhere('codigo_barras', 'ilike', "%{$search}%")
                    ->orWhere('descripcion', 'ilike', "%{$search}%");
            });
        }

        if ($categoriaId !== '' && $categorias->contains('id', $categoriaId)) {
            $query->where('categoria_id', $categoriaId);
        } else {
            $categoriaId = '';
        }

        if ($areaId !== '' && $areas->contains('id', $areaId)) {
            $query->where('area_id', $areaId);
        } else {
            $areaId = '';
        }

        if ($estado === 'activos') {
            $query->where('activo', true);
        } elseif ($estado === 'inactivos') {
            $query->where('activo', false);
        }

        $productos = $query->paginate($perPage)->withQueryString();

        /** @var array<string, int> $nextProductoOrdenByCategoria */
        $nextProductoOrdenByCategoria = $sedeId === ''
            ? []
            : ProductoCarta::query()
                ->where('sede_id', $sedeId)
                ->selectRaw('categoria_id, COALESCE(MAX(orden), 0) + 1 as next_orden')
                ->groupBy('categoria_id')
                ->pluck('next_orden', 'categoria_id')
                ->map(static fn ($v): int => (int) $v)
                ->all();

        $nextCategoriaOrden = $sedeId === ''
            ? 1
            : ((int) CategoriaCarta::query()->where('sede_id', $sedeId)->max('orden')) + 1;

        return Inertia::render('carta/index', [
            'productos' => $productos,
            'categorias' => $categorias,
            'areas' => $areas,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'categoria_id' => $categoriaId !== '' ? $categoriaId : null,
                'area_id' => $areaId !== '' ? $areaId : null,
                'estado' => $estado,
            ],
            'stats' => [
                'productos' => $sedeId === '' ? 0 : ProductoCarta::query()->where('sede_id', $sedeId)->count(),
                'productos_activos' => $sedeId === '' ? 0 : ProductoCarta::query()->where('sede_id', $sedeId)->where('activo', true)->count(),
                'categorias' => $categorias->count(),
                'areas' => $areas->count(),
                'coincidencias' => $productos->total(),
            ],
            'next_producto_orden_by_categoria' => $nextProductoOrdenByCategoria,
            'next_categoria_orden' => max(1, $nextCategoriaOrden),
            'plan_productos_reached' => PlanLimits::isReached('max_productos'),
            'copy_targets' => array_values(array_filter(
                ActiveSedeContext::accessibleCatalog(),
                static fn (array $s): bool => $s['id'] !== $sedeId,
            )),
        ]);
    }

    public function copyToSede(Request $request, CopyCartaToSedeService $copier): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $from = $this->activeSedeIdOrAbort();
        $data = $request->validate([
            'target_sede_id' => ['required', 'uuid'],
        ]);

        $result = $copier->copy($from, (string) $data['target_sede_id']);

        return back()->with(
            'success',
            sprintf(
                'Copia a sede lista: %d áreas, %d categorías, %d productos, %d cartas.',
                $result['areas'],
                $result['categorias'],
                $result['productos'],
                $result['menus'],
            ),
        );
    }

    public function storeArea(AreaCartaRequest $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $nombre = (string) $request->validated('nombre');
        $existing = AreaCarta::query()
            ->where('sede_id', $sedeId)
            ->whereRaw('lower(nombre) = ?', [mb_strtolower($nombre)])
            ->first();

        if ($existing !== null) {
            return back()->with([
                'success' => 'Área ya existía.',
                'created_area_id' => $existing->id,
            ]);
        }

        $maxOrden = (int) AreaCarta::query()->where('sede_id', $sedeId)->max('orden');
        $area = AreaCarta::query()->create([
            'sede_id' => $sedeId,
            'nombre' => $nombre,
            'orden' => $maxOrden + 10,
            'activa' => true,
        ]);

        return back()->with([
            'success' => 'Área creada correctamente.',
            'created_area_id' => $area->id,
        ]);
    }

    public function destroyArea(AreaCarta $areaCarta): RedirectResponse
    {
        $this->tenantIdOrAbort();

        if ($areaCarta->productos()->exists()) {
            throw ValidationException::withMessages([
                'area' => 'No se puede eliminar un área con productos asignados. Cámbiales el área primero.',
            ]);
        }

        $areaCarta->delete();

        return back()->with('success', 'Área eliminada correctamente.');
    }

    public function storeCategoria(CategoriaCartaRequest $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        CategoriaCarta::query()->create([
            ...$request->validated(),
            'sede_id' => $sedeId,
        ]);

        return back()->with('success', 'Categoría creada correctamente.');
    }

    public function updateCategoria(CategoriaCartaRequest $request, CategoriaCarta $categoriaCarta): RedirectResponse
    {
        $this->tenantIdOrAbort();

        $categoriaCarta->update($request->validated());

        return back()->with('success', 'Categoría actualizada correctamente.');
    }

    public function destroyCategoria(CategoriaCarta $categoriaCarta): RedirectResponse
    {
        $this->tenantIdOrAbort();

        if ($categoriaCarta->productos()->exists()) {
            throw ValidationException::withMessages([
                'categoria' => 'No se puede eliminar una categoría con productos. Muévelos o elimínalos primero.',
            ]);
        }

        $categoriaCarta->delete();

        return back()->with('success', 'Categoría eliminada correctamente.');
    }

    public function storeProducto(
        ProductoCartaRequest $request,
        TenantManager $tenants,
        KardexService $kardex,
    ): RedirectResponse {
        $this->tenantIdOrAbort();

        $sedeId = $this->activeSedeIdOrAbort();
        $data = $this->productoPayload($request);
        $stockInicial = (float) ($request->validated('stock_inicial') ?? 0);
        unset($data['stock_inicial']);
        $data['sede_id'] = $sedeId;

        if ($data['control_inventario'] !== ProductoCarta::CONTROL_SKU) {
            $data['stock'] = null;
            $data['stock_minimo'] = null;
            $data['codigo_barras'] = null;
        } else {
            $data['stock'] = 0;
        }

        $producto = ProductoCarta::query()->create($data);
        $this->applyProductoImagen($producto, $request, $tenants);
        $producto->save();

        if ($producto->tracksSkuStock()) {
            $kardex->stockInicial($producto, $stockInicial);
        }

        return back()->with('success', 'Producto creado correctamente.');
    }

    public function updateProducto(
        ProductoCartaRequest $request,
        ProductoCarta $productoCarta,
        TenantManager $tenants,
        KardexService $kardex,
    ): RedirectResponse {
        $this->tenantIdOrAbort();

        $data = $this->productoPayload($request);
        unset($data['stock_inicial']);

        $prevControl = $productoCarta->control_inventario;
        $newControl = (string) $data['control_inventario'];

        if ($newControl !== ProductoCarta::CONTROL_SKU) {
            $data['stock'] = null;
            $data['stock_minimo'] = null;
            $data['codigo_barras'] = null;
        } else {
            // El stock operativo solo se mueve por kardex; conservar el actual.
            unset($data['stock']);
            if ($prevControl !== ProductoCarta::CONTROL_SKU) {
                $data['stock'] = 0;
            }
        }

        $productoCarta->fill($data);
        $this->applyProductoImagen($productoCarta, $request, $tenants);
        $productoCarta->save();

        if (
            $prevControl !== ProductoCarta::CONTROL_SKU
            && $productoCarta->tracksSkuStock()
        ) {
            $stockInicial = (float) ($request->validated('stock_inicial') ?? 0);
            $kardex->stockInicial($productoCarta, $stockInicial);
        }

        return back()->with('success', 'Producto actualizado correctamente.');
    }

    public function export(Request $request): StreamedResponse
    {
        $this->tenantIdOrAbort();

        $search = trim((string) $request->string('search', ''));
        $categoriaId = (string) $request->string('categoria_id', '');
        $estado = (string) $request->string('estado', 'todos');

        $sedeId = ActiveSedeContext::id() ?? '';

        $query = ProductoCarta::query()
            ->with([
                'categoria:id,nombre',
                'area:id,nombre',
            ])
            ->orderBy('orden')
            ->orderBy('nombre');

        if ($sedeId !== '') {
            $query->where('sede_id', $sedeId);
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('nombre', 'ilike', "%{$search}%")
                    ->orWhere('codigo', 'ilike', "%{$search}%")
                    ->orWhere('codigo_barras', 'ilike', "%{$search}%")
                    ->orWhere('descripcion', 'ilike', "%{$search}%");
            });
        }

        if ($categoriaId !== '') {
            $query->where('categoria_id', $categoriaId);
        }

        if ($estado === 'activos') {
            $query->where('activo', true);
        } elseif ($estado === 'inactivos') {
            $query->where('activo', false);
        }

        $exporter = new CartaProductosXlsxExport;

        return response()->streamDownload(
            fn () => $exporter->streamTo($query),
            'carta-productos-'.now()->format('Y-m-d-His').'.xlsx',
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
        );
    }

    public function destroyProducto(ProductoCarta $productoCarta): RedirectResponse
    {
        $this->tenantIdOrAbort();

        $productoCarta->deleteImagenFile();
        $productoCarta->delete();

        return back()->with('success', 'Producto eliminado correctamente.');
    }

    /**
     * @return array<string, mixed>
     */
    private function productoPayload(ProductoCartaRequest $request): array
    {
        /** @var array<string, mixed> $data */
        $data = $request->safe()->except(['imagen', 'clear_imagen', 'stock_inicial']);

        return $data;
    }

    private function applyProductoImagen(
        ProductoCarta $producto,
        ProductoCartaRequest $request,
        TenantManager $tenants,
    ): void {
        $disk = Storage::disk('public');

        if ($request->boolean('clear_imagen')) {
            $producto->deleteImagenFile();
            $producto->imagen_path = null;

            return;
        }

        if (! $request->hasFile('imagen')) {
            return;
        }

        $file = $request->file('imagen');
        if ($file === null) {
            return;
        }

        $slug = $tenants->slug() ?? 'shared';
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'jpg');
        $filename = Str::uuid()->toString().'.'.$extension;
        $directory = "tenants/{$slug}/productos";

        $disk->putFileAs($directory, $file, $filename, 'public');

        $previous = $producto->imagen_path;
        $producto->imagen_path = "{$directory}/{$filename}";

        if ($previous && $previous !== $producto->imagen_path && $disk->exists($previous)) {
            $disk->delete($previous);
        }
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Http\Requests\AreaCartaRequest;
use App\Http\Requests\CategoriaCartaRequest;
use App\Http\Requests\ProductoCartaRequest;
use App\Models\AreaCarta;
use App\Models\CategoriaCarta;
use App\Models\ProductoCarta;
use App\Support\Plan\PlanLimits;
use App\Tenancy\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CartaController extends Controller
{
    use ResolvesTenantId;

    private const PER_PAGE_OPTIONS = [10, 12, 15, 20, 25, 50];

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();

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

        $categorias = CategoriaCarta::query()
            ->withCount('productos')
            ->orderBy('orden')
            ->orderBy('nombre')
            ->get();

        $areas = AreaCarta::query()
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

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('nombre', 'ilike', "%{$search}%")
                    ->orWhere('codigo', 'ilike', "%{$search}%")
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
                'productos' => ProductoCarta::query()->count(),
                'productos_activos' => ProductoCarta::query()->where('activo', true)->count(),
                'categorias' => $categorias->count(),
                'areas' => $areas->count(),
                'coincidencias' => $productos->total(),
            ],
            'plan_productos_reached' => PlanLimits::isReached('max_productos'),
        ]);
    }

    public function builder(): Response
    {
        $this->tenantIdOrAbort();

        return Inertia::render('carta/builder', [
            'productos_count' => ProductoCarta::query()->where('activo', true)->count(),
            'areas_count' => AreaCarta::query()->where('activa', true)->count(),
        ]);
    }

    public function storeArea(AreaCartaRequest $request): RedirectResponse
    {
        $this->tenantIdOrAbort();

        $nombre = (string) $request->validated('nombre');
        $existing = AreaCarta::query()
            ->whereRaw('lower(nombre) = ?', [mb_strtolower($nombre)])
            ->first();

        if ($existing !== null) {
            return back()->with([
                'success' => 'Área ya existía.',
                'created_area_id' => $existing->id,
            ]);
        }

        $maxOrden = (int) AreaCarta::query()->max('orden');
        $area = AreaCarta::query()->create([
            'nombre' => $nombre,
            'orden' => $maxOrden + 10,
            'activa' => true,
        ]);

        return back()->with([
            'success' => 'Área creada correctamente.',
            'created_area_id' => $area->id,
        ]);
    }

    public function storeCategoria(CategoriaCartaRequest $request): RedirectResponse
    {
        $this->tenantIdOrAbort();

        CategoriaCarta::query()->create($request->validated());

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
    ): RedirectResponse {
        $this->tenantIdOrAbort();

        $data = $this->productoPayload($request);
        $producto = ProductoCarta::query()->create($data);
        $this->applyProductoImagen($producto, $request, $tenants);
        $producto->save();

        return back()->with('success', 'Producto creado correctamente.');
    }

    public function updateProducto(
        ProductoCartaRequest $request,
        ProductoCarta $productoCarta,
        TenantManager $tenants,
    ): RedirectResponse {
        $this->tenantIdOrAbort();

        $productoCarta->fill($this->productoPayload($request));
        $this->applyProductoImagen($productoCarta, $request, $tenants);
        $productoCarta->save();

        return back()->with('success', 'Producto actualizado correctamente.');
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
        $data = $request->safe()->except(['imagen', 'clear_imagen']);

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

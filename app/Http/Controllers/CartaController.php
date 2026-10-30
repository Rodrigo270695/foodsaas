<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Http\Requests\CategoriaCartaRequest;
use App\Http\Requests\ProductoCartaRequest;
use App\Models\CategoriaCarta;
use App\Models\ProductoCarta;
use App\Support\Plan\PlanLimits;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CartaController extends Controller
{
    use ResolvesTenantId;

    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50];

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();

        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true)
            ? $perPageRequested
            : 10;

        $categoriaId = (string) $request->string('categoria_id', '');
        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, ['todos', 'activos', 'inactivos'], true)) {
            $estado = 'todos';
        }

        $categorias = CategoriaCarta::query()
            ->withCount('productos')
            ->orderBy('orden')
            ->orderBy('nombre')
            ->get();

        $query = ProductoCarta::query()
            ->with(['categoria:id,nombre'])
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

        if ($estado === 'activos') {
            $query->where('activo', true);
        } elseif ($estado === 'inactivos') {
            $query->where('activo', false);
        }

        $productos = $query->paginate($perPage)->withQueryString();

        return Inertia::render('carta/index', [
            'productos' => $productos,
            'categorias' => $categorias,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'categoria_id' => $categoriaId !== '' ? $categoriaId : null,
                'estado' => $estado,
            ],
            'stats' => [
                'productos' => ProductoCarta::query()->count(),
                'productos_activos' => ProductoCarta::query()->where('activo', true)->count(),
                'categorias' => $categorias->count(),
                'coincidencias' => $productos->total(),
            ],
            'plan_productos_reached' => PlanLimits::isReached('max_productos'),
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

    public function storeProducto(ProductoCartaRequest $request): RedirectResponse
    {
        $this->tenantIdOrAbort();

        ProductoCarta::query()->create($request->validated());

        return back()->with('success', 'Producto creado correctamente.');
    }

    public function updateProducto(ProductoCartaRequest $request, ProductoCarta $productoCarta): RedirectResponse
    {
        $this->tenantIdOrAbort();

        $productoCarta->update($request->validated());

        return back()->with('success', 'Producto actualizado correctamente.');
    }

    public function destroyProducto(ProductoCarta $productoCarta): RedirectResponse
    {
        $this->tenantIdOrAbort();

        $productoCarta->delete();

        return back()->with('success', 'Producto eliminado correctamente.');
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Http\Requests\MenuCartaRequest;
use App\Models\MenuCarta;
use App\Models\MenuCartaItem;
use App\Models\ProductoCarta;
use App\Models\RestaurantSetting;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CartaMenuController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    public function index(): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';

        $cartas = $sedeId === ''
            ? collect()
            : MenuCarta::query()
                ->where('sede_id', $sedeId)
                ->withCount('items')
                ->orderByDesc('updated_at')
                ->get();

        return Inertia::render('carta/builder/index', [
            'cartas' => $cartas,
            'productos_activos' => $sedeId === ''
                ? 0
                : ProductoCarta::query()->where('sede_id', $sedeId)->where('activo', true)->count(),
            'logo_url' => RestaurantSetting::current()->logo_url,
        ]);
    }

    public function store(MenuCartaRequest $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $data = $request->validated();
        $carta = MenuCarta::query()->create([
            ...$data,
            'sede_id' => $sedeId,
            'slug' => MenuCarta::uniqueSlug((string) $data['nombre']),
        ]);

        return redirect()
            ->route('carta.menus.edit', $carta)
            ->with('success', 'Carta creada. Arrastra productos al canvas.');
    }

    public function edit(MenuCarta $menuCarta): Response
    {
        $this->tenantIdOrAbort();
        $this->assertMenuSede($menuCarta);

        $menuCarta->load([
            'items.producto:id,nombre,precio,descripcion,imagen_path,categoria_id,activo',
            'items.producto.categoria:id,nombre',
        ]);

        $sedeId = (string) $menuCarta->sede_id;
        $productos = ProductoCarta::query()
            ->with('categoria:id,nombre')
            ->where('sede_id', $sedeId)
            ->where('activo', true)
            ->orderBy('orden')
            ->orderBy('nombre')
            ->get([
                'id',
                'categoria_id',
                'nombre',
                'descripcion',
                'precio',
                'imagen_path',
                'activo',
                'orden',
            ]);

        return Inertia::render('carta/builder/edit', [
            'carta' => $menuCarta,
            'productos' => $productos,
            'logo_url' => RestaurantSetting::current()->logo_url,
            'public_path' => '/m/'.$menuCarta->slug,
        ]);
    }

    public function update(MenuCartaRequest $request, MenuCarta $menuCarta): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertMenuSede($menuCarta);

        $data = $request->validated();
        if ($menuCarta->nombre !== $data['nombre']) {
            $data['slug'] = MenuCarta::uniqueSlug((string) $data['nombre'], $menuCarta->id);
        }

        $menuCarta->update($data);

        return back()->with('success', 'Carta actualizada.');
    }

    public function destroy(MenuCarta $menuCarta): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertMenuSede($menuCarta);

        $menuCarta->delete();

        return redirect()
            ->route('carta.menus.index')
            ->with('success', 'Carta eliminada.');
    }

    public function syncItems(Request $request, MenuCarta $menuCarta): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertMenuSede($menuCarta);

        $validated = $request->validate([
            'pages' => ['required', 'array', 'min:1'],
            'pages.*' => ['array'],
            'pages.*.*' => ['uuid', 'exists:cat_productos,id'],
        ]);

        /** @var array<string, list<string>> $pages */
        $pages = $validated['pages'];
        $sedeId = (string) $menuCarta->sede_id;

        $menuCarta->items()->delete();

        foreach ($pages as $paginaKey => $productoIds) {
            $pagina = (int) $paginaKey;
            if ($pagina < 1 || $pagina > max(1, (int) $menuCarta->paginas)) {
                continue;
            }

            $ids = array_values(array_unique($productoIds));
            $validIds = ProductoCarta::query()
                ->where('sede_id', $sedeId)
                ->whereIn('id', $ids)
                ->pluck('id')
                ->all();
            $validSet = array_flip($validIds);

            foreach ($ids as $index => $productoId) {
                if (! isset($validSet[$productoId])) {
                    continue;
                }
                MenuCartaItem::query()->create([
                    'carta_id' => $menuCarta->id,
                    'producto_id' => $productoId,
                    'pagina' => $pagina,
                    'orden' => ($index + 1) * 10,
                ]);
            }
        }

        return back()->with('success', 'Canvas guardado.');
    }

    public function preview(MenuCarta $menuCarta): Response
    {
        $this->tenantIdOrAbort();
        $this->assertMenuSede($menuCarta);

        $menuCarta->load([
            'items.producto:id,nombre,precio,descripcion,imagen_path,categoria_id',
            'items.producto.categoria:id,nombre',
        ]);

        return Inertia::render('carta/builder/preview', [
            'carta' => $menuCarta,
            'logo_url' => RestaurantSetting::current()->logo_url,
        ]);
    }

    private function assertMenuSede(MenuCarta $menuCarta): void
    {
        ActiveSedeContext::assertAccessible((string) $menuCarta->sede_id);
    }
}

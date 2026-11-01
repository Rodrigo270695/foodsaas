<?php

namespace App\Services\Sedes;

use App\Models\AreaCarta;
use App\Models\CategoriaCarta;
use App\Models\MenuCarta;
use App\Models\MenuCartaItem;
use App\Models\ProductoCarta;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class CopyCartaToSedeService
{
    /**
     * Copia catálogo (áreas, categorías, productos) y cartas publicables.
     *
     * @return array{areas: int, categorias: int, productos: int, menus: int}
     */
    public function copy(string $fromSedeId, string $toSedeId): array
    {
        ActiveSedeContext::assertAccessible($fromSedeId);
        ActiveSedeContext::assertAccessible($toSedeId);

        if ($fromSedeId === $toSedeId) {
            throw ValidationException::withMessages([
                'target_sede_id' => 'Elige una sede distinta a la actual.',
            ]);
        }

        return DB::transaction(function () use ($fromSedeId, $toSedeId): array {
            $areasCopied = 0;
            $categoriasCopied = 0;
            $productosCopied = 0;
            $menusCopied = 0;

            $areaMap = [];
            foreach (AreaCarta::query()->where('sede_id', $fromSedeId)->orderBy('orden')->get() as $area) {
                $existing = AreaCarta::query()
                    ->where('sede_id', $toSedeId)
                    ->whereRaw('lower(nombre) = ?', [mb_strtolower($area->nombre)])
                    ->first();
                if ($existing) {
                    $areaMap[$area->id] = $existing->id;
                    continue;
                }
                $new = AreaCarta::query()->create([
                    'sede_id' => $toSedeId,
                    'nombre' => $area->nombre,
                    'orden' => $area->orden,
                    'activa' => $area->activa,
                ]);
                $areaMap[$area->id] = $new->id;
                $areasCopied++;
            }

            $categoriaMap = [];
            foreach (CategoriaCarta::query()->where('sede_id', $fromSedeId)->orderBy('orden')->get() as $cat) {
                $existing = CategoriaCarta::query()
                    ->where('sede_id', $toSedeId)
                    ->whereRaw('lower(nombre) = ?', [mb_strtolower($cat->nombre)])
                    ->first();
                if ($existing) {
                    $categoriaMap[$cat->id] = $existing->id;
                    continue;
                }
                $new = CategoriaCarta::query()->create([
                    'sede_id' => $toSedeId,
                    'nombre' => $cat->nombre,
                    'descripcion' => $cat->descripcion,
                    'orden' => $cat->orden,
                    'activa' => $cat->activa,
                ]);
                $categoriaMap[$cat->id] = $new->id;
                $categoriasCopied++;
            }

            $productoMap = [];
            foreach (ProductoCarta::query()->where('sede_id', $fromSedeId)->orderBy('orden')->get() as $prod) {
                $targetCat = $categoriaMap[$prod->categoria_id] ?? null;
                if ($targetCat === null) {
                    continue;
                }

                $existing = ProductoCarta::query()
                    ->where('sede_id', $toSedeId)
                    ->where('categoria_id', $targetCat)
                    ->whereRaw('lower(nombre) = ?', [mb_strtolower($prod->nombre)])
                    ->first();

                if ($existing) {
                    $productoMap[$prod->id] = $existing->id;
                    continue;
                }

                $new = ProductoCarta::query()->create([
                    'sede_id' => $toSedeId,
                    'categoria_id' => $targetCat,
                    'area_id' => $prod->area_id ? ($areaMap[$prod->area_id] ?? null) : null,
                    'nombre' => $prod->nombre,
                    'descripcion' => $prod->descripcion,
                    'codigo' => $prod->codigo,
                    'codigo_barras' => $prod->codigo_barras,
                    'precio' => $prod->precio,
                    'orden' => $prod->orden,
                    'activo' => $prod->activo,
                    'imagen_path' => $prod->imagen_path,
                    'control_inventario' => $prod->control_inventario,
                    'stock' => $prod->control_inventario === ProductoCarta::CONTROL_SKU ? 0 : null,
                    'stock_minimo' => $prod->stock_minimo,
                ]);
                $productoMap[$prod->id] = $new->id;
                $productosCopied++;
            }

            foreach (MenuCarta::query()->where('sede_id', $fromSedeId)->orderBy('nombre')->get() as $menu) {
                $baseSlug = $menu->slug.'-'.Str::slug(Str::substr($toSedeId, 0, 8));
                $slug = $baseSlug;
                $i = 1;
                while (MenuCarta::query()->where('slug', $slug)->exists()) {
                    $slug = $baseSlug.'-'.$i;
                    $i++;
                }

                $newMenu = MenuCarta::query()->create([
                    'sede_id' => $toSedeId,
                    'nombre' => $menu->nombre,
                    'slug' => $slug,
                    'descripcion' => $menu->descripcion,
                    'fondo_preset' => $menu->fondo_preset,
                    'paginas' => $menu->paginas,
                    'publicada' => false,
                    'vigente_desde' => $menu->vigente_desde,
                    'vigente_hasta' => $menu->vigente_hasta,
                ]);
                $menusCopied++;

                $items = MenuCartaItem::query()
                    ->where('carta_id', $menu->id)
                    ->orderBy('pagina')
                    ->orderBy('orden')
                    ->get();

                foreach ($items as $item) {
                    $newProductoId = $productoMap[$item->producto_id] ?? null;
                    if ($newProductoId === null) {
                        continue;
                    }
                    MenuCartaItem::query()->create([
                        'carta_id' => $newMenu->id,
                        'producto_id' => $newProductoId,
                        'pagina' => $item->pagina,
                        'orden' => $item->orden,
                        'notas' => $item->notas,
                    ]);
                }
            }

            return [
                'areas' => $areasCopied,
                'categorias' => $categoriasCopied,
                'productos' => $productosCopied,
                'menus' => $menusCopied,
            ];
        });
    }
}

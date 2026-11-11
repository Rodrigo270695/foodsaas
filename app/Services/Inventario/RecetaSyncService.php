<?php

namespace App\Services\Inventario;

use App\Models\Insumo;
use App\Models\ProductoCarta;
use App\Models\Receta;
use App\Models\RecetaLinea;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecetaSyncService
{
    /**
     * @param  list<array{insumo_id: string, cantidad: float|int|string}>  $lineas
     */
    public function sync(ProductoCarta $producto, array $lineas, ?string $notas = null): Receta
    {
        if (! $producto->tracksRecipeStock()) {
            throw ValidationException::withMessages([
                'control_inventario' => 'Solo productos con control receta admiten BOM.',
            ]);
        }

        $normalized = [];
        foreach ($lineas as $row) {
            $insumoId = (string) ($row['insumo_id'] ?? '');
            $cantidad = round((float) ($row['cantidad'] ?? 0), 3);
            if ($insumoId === '' || $cantidad <= 0) {
                continue;
            }
            if (isset($normalized[$insumoId])) {
                $normalized[$insumoId] = round($normalized[$insumoId] + $cantidad, 3);
            } else {
                $normalized[$insumoId] = $cantidad;
            }
        }

        if ($normalized === []) {
            throw ValidationException::withMessages([
                'receta_lineas' => 'Agrega al menos un insumo a la receta.',
            ]);
        }

        $insumoIds = array_keys($normalized);
        $existentes = Insumo::query()
            ->whereIn('id', $insumoIds)
            ->where('activo', true)
            ->pluck('id')
            ->all();

        if (count($existentes) !== count($insumoIds)) {
            throw ValidationException::withMessages([
                'receta_lineas' => 'Uno o más insumos no existen o están inactivos.',
            ]);
        }

        return DB::transaction(function () use ($producto, $normalized, $notas): Receta {
            /** @var Receta $receta */
            $receta = Receta::query()->updateOrCreate(
                ['producto_id' => $producto->id],
                ['notas' => $notas !== null && trim($notas) !== '' ? trim($notas) : null],
            );

            $receta->lineas()->delete();

            foreach ($normalized as $insumoId => $cantidad) {
                RecetaLinea::query()->create([
                    'receta_id' => $receta->id,
                    'insumo_id' => $insumoId,
                    'cantidad' => $cantidad,
                ]);
            }

            return $receta->load('lineas.insumo');
        });
    }

    public function clearIfNotRecipe(ProductoCarta $producto): void
    {
        if ($producto->tracksRecipeStock()) {
            return;
        }

        Receta::query()->where('producto_id', $producto->id)->delete();
    }
}

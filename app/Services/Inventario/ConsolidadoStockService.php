<?php

namespace App\Services\Inventario;

use App\Models\Insumo;
use App\Models\ProductoCarta;
use App\Models\Sede;
use Illuminate\Support\Collection;

class ConsolidadoStockService
{
    /**
     * @return list<array{
     *     clave: string,
     *     nombre: string,
     *     tipo: string,
     *     unidad: string,
     *     stock_total: float,
     *     bajo_minimo: bool,
     *     sedes: list<array{sede_id: string, sede: string, stock: float, stock_minimo: float|null, item_id: string}>
     * }>
     */
    public function consolidar(?string $q = null): array
    {
        $sedes = Sede::query()
            ->where('activa', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre'])
            ->keyBy('id');

        $productos = ProductoCarta::query()
            ->where('control_inventario', ProductoCarta::CONTROL_SKU)
            ->where('activo', true)
            ->when($q, fn ($query) => $query->where('nombre', 'ilike', "%{$q}%"))
            ->get(['id', 'sede_id', 'nombre', 'stock', 'stock_minimo']);

        $insumos = Insumo::query()
            ->where('activo', true)
            ->when($q, fn ($query) => $query->where('nombre', 'ilike', "%{$q}%"))
            ->get(['id', 'sede_id', 'nombre', 'unidad', 'stock', 'stock_minimo']);

        $grupos = [];

        foreach ($productos as $p) {
            $clave = 'producto:'.mb_strtolower(trim((string) $p->nombre));
            $sedeNombre = (string) ($sedes[$p->sede_id]->nombre ?? '—');
            if (! isset($grupos[$clave])) {
                $grupos[$clave] = [
                    'clave' => $clave,
                    'nombre' => (string) $p->nombre,
                    'tipo' => 'producto',
                    'unidad' => 'und',
                    'stock_total' => 0.0,
                    'bajo_minimo' => false,
                    'sedes' => [],
                ];
            }
            $stock = (float) $p->stock;
            $min = $p->stock_minimo !== null ? (float) $p->stock_minimo : null;
            $grupos[$clave]['stock_total'] += $stock;
            if ($min !== null && $stock <= $min) {
                $grupos[$clave]['bajo_minimo'] = true;
            }
            $grupos[$clave]['sedes'][] = [
                'sede_id' => (string) $p->sede_id,
                'sede' => $sedeNombre,
                'stock' => $stock,
                'stock_minimo' => $min,
                'item_id' => (string) $p->id,
            ];
        }

        foreach ($insumos as $i) {
            $clave = 'insumo:'.mb_strtolower(trim((string) $i->nombre));
            $sedeNombre = $i->sede_id
                ? (string) ($sedes[$i->sede_id]->nombre ?? '—')
                : 'Todas';
            if (! isset($grupos[$clave])) {
                $grupos[$clave] = [
                    'clave' => $clave,
                    'nombre' => (string) $i->nombre,
                    'tipo' => 'insumo',
                    'unidad' => (string) $i->unidad,
                    'stock_total' => 0.0,
                    'bajo_minimo' => false,
                    'sedes' => [],
                ];
            }
            $stock = (float) $i->stock;
            $min = $i->stock_minimo !== null ? (float) $i->stock_minimo : null;
            $grupos[$clave]['stock_total'] += $stock;
            if ($min !== null && $stock <= $min) {
                $grupos[$clave]['bajo_minimo'] = true;
            }
            $grupos[$clave]['sedes'][] = [
                'sede_id' => (string) ($i->sede_id ?? ''),
                'sede' => $sedeNombre,
                'stock' => $stock,
                'stock_minimo' => $min,
                'item_id' => (string) $i->id,
            ];
        }

        return Collection::make($grupos)
            ->sortBy('nombre')
            ->values()
            ->map(function (array $row): array {
                $row['stock_total'] = round($row['stock_total'], 3);

                return $row;
            })
            ->all();
    }
}

<?php

namespace App\Services\Inventario;

use App\Models\Compra;
use App\Models\CompraLinea;
use App\Models\Insumo;
use App\Models\ProductoCarta;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompraSyncService
{
    public function __construct(
        private readonly CompraRecepcionService $recepcion,
    ) {}

    /**
     * @param  array{
     *     proveedor_id?: string|null,
     *     fecha: string,
     *     notas?: string|null,
     *     lineas: list<array{
     *         linea_tipo: string,
     *         insumo_id?: string|null,
     *         producto_id?: string|null,
     *         cantidad: float|int|string,
     *         costo_unitario: float|int|string,
     *         unidad?: string|null
     *     }>
     * }  $data
     */
    public function create(string $sedeId, array $data): Compra
    {
        return DB::transaction(function () use ($sedeId, $data): Compra {
            $numero = ((int) Compra::query()->where('sede_id', $sedeId)->max('numero')) + 1;

            $compra = Compra::query()->create([
                'sede_id' => $sedeId,
                'proveedor_id' => $data['proveedor_id'] ?? null,
                'numero' => $numero,
                'estado' => Compra::ESTADO_BORRADOR,
                'fecha' => $data['fecha'],
                'notas' => $data['notas'] ?? null,
                'total' => 0,
                'user_id' => Auth::id(),
            ]);

            $this->replaceLineas($compra, $data['lineas']);
            $compra->total = $this->recepcion->computeTotal($compra->fresh('lineas'));
            $compra->save();

            return $compra->fresh(['lineas.insumo', 'lineas.producto', 'proveedor']);
        });
    }

    /**
     * @param  array{
     *     proveedor_id?: string|null,
     *     fecha: string,
     *     notas?: string|null,
     *     lineas: list<array{
     *         linea_tipo: string,
     *         insumo_id?: string|null,
     *         producto_id?: string|null,
     *         cantidad: float|int|string,
     *         costo_unitario: float|int|string,
     *         unidad?: string|null
     *     }>
     * }  $data
     */
    public function update(Compra $compra, array $data): Compra
    {
        if (! $compra->isEditable()) {
            throw ValidationException::withMessages([
                'compra' => 'Solo se pueden editar órdenes en borrador.',
            ]);
        }

        return DB::transaction(function () use ($compra, $data): Compra {
            $compra->update([
                'proveedor_id' => $data['proveedor_id'] ?? null,
                'fecha' => $data['fecha'],
                'notas' => $data['notas'] ?? null,
            ]);

            $this->replaceLineas($compra, $data['lineas']);
            $compra->total = $this->recepcion->computeTotal($compra->fresh('lineas'));
            $compra->save();

            return $compra->fresh(['lineas.insumo', 'lineas.producto', 'proveedor']);
        });
    }

    public function emitir(Compra $compra): Compra
    {
        if (! $compra->canEmitir()) {
            throw ValidationException::withMessages([
                'compra' => 'Solo se pueden emitir órdenes en borrador.',
            ]);
        }

        $compra->load('lineas');
        if ($compra->lineas->isEmpty()) {
            throw ValidationException::withMessages([
                'lineas' => 'La orden debe tener al menos una línea.',
            ]);
        }

        $compra->estado = Compra::ESTADO_ENVIADA;
        $compra->save();

        return $compra->fresh(['lineas.insumo', 'lineas.producto', 'proveedor']);
    }

    public function anular(Compra $compra): Compra
    {
        if (! $compra->canAnular()) {
            throw ValidationException::withMessages([
                'compra' => 'No se puede anular: ya tiene recepción o el estado no lo permite.',
            ]);
        }

        $compra->estado = Compra::ESTADO_ANULADA;
        $compra->save();

        return $compra;
    }

    /**
     * @param  list<array{
     *     linea_tipo: string,
     *     insumo_id?: string|null,
     *     producto_id?: string|null,
     *     cantidad: float|int|string,
     *     costo_unitario: float|int|string,
     *     unidad?: string|null
     * }>  $lineas
     */
    private function replaceLineas(Compra $compra, array $lineas): void
    {
        if ($lineas === []) {
            throw ValidationException::withMessages([
                'lineas' => 'Agrega al menos una línea.',
            ]);
        }

        $compra->lineas()->delete();

        $seenInsumo = [];
        $seenProducto = [];

        foreach ($lineas as $index => $raw) {
            $tipo = (string) ($raw['linea_tipo'] ?? '');
            if (! in_array($tipo, CompraLinea::TIPOS, true)) {
                throw ValidationException::withMessages([
                    "lineas.{$index}.linea_tipo" => 'Tipo de línea inválido.',
                ]);
            }

            $cantidad = round((float) ($raw['cantidad'] ?? 0), 3);
            $costo = round((float) ($raw['costo_unitario'] ?? 0), 4);
            if ($cantidad <= 0) {
                throw ValidationException::withMessages([
                    "lineas.{$index}.cantidad" => 'La cantidad debe ser mayor a cero.',
                ]);
            }
            if ($costo < 0) {
                throw ValidationException::withMessages([
                    "lineas.{$index}.costo_unitario" => 'El costo no puede ser negativo.',
                ]);
            }

            $insumoId = null;
            $productoId = null;
            $unidad = trim((string) ($raw['unidad'] ?? '')) ?: 'und';

            if ($tipo === CompraLinea::TIPO_INSUMO) {
                $insumoId = (string) ($raw['insumo_id'] ?? '');
                if ($insumoId === '' || isset($seenInsumo[$insumoId])) {
                    throw ValidationException::withMessages([
                        "lineas.{$index}.insumo_id" => 'Insumo duplicado o vacío.',
                    ]);
                }
                $insumo = Insumo::query()->whereKey($insumoId)->where('activo', true)->first();
                if ($insumo === null) {
                    throw ValidationException::withMessages([
                        "lineas.{$index}.insumo_id" => 'Insumo no válido.',
                    ]);
                }
                $unidad = $insumo->unidad;
                $seenInsumo[$insumoId] = true;
            } else {
                $productoId = (string) ($raw['producto_id'] ?? '');
                if ($productoId === '' || isset($seenProducto[$productoId])) {
                    throw ValidationException::withMessages([
                        "lineas.{$index}.producto_id" => 'Producto duplicado o vacío.',
                    ]);
                }
                $producto = ProductoCarta::query()
                    ->whereKey($productoId)
                    ->where('control_inventario', ProductoCarta::CONTROL_SKU)
                    ->where('activo', true)
                    ->first();
                if ($producto === null) {
                    throw ValidationException::withMessages([
                        "lineas.{$index}.producto_id" => 'Producto SKU no válido.',
                    ]);
                }
                $unidad = 'und';
                $seenProducto[$productoId] = true;
            }

            CompraLinea::query()->create([
                'compra_id' => $compra->id,
                'linea_tipo' => $tipo,
                'insumo_id' => $insumoId,
                'producto_id' => $productoId,
                'cantidad' => $cantidad,
                'cantidad_recibida' => 0,
                'costo_unitario' => $costo,
                'unidad' => $unidad,
            ]);
        }
    }
}

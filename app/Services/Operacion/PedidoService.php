<?php

namespace App\Services\Operacion;

use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Models\ProductoCarta;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PedidoService
{
    public function abrir(string $sedeId, array $data): Pedido
    {
        $canal = (string) ($data['canal'] ?? Pedido::CANAL_SALON);
        $mesaId = isset($data['mesa_id']) && $data['mesa_id'] !== ''
            ? (string) $data['mesa_id']
            : null;

        if ($canal === Pedido::CANAL_SALON && $mesaId === null) {
            throw ValidationException::withMessages([
                'mesa_id' => 'Selecciona una mesa para el pedido de salón.',
            ]);
        }

        return DB::transaction(function () use ($sedeId, $data, $canal, $mesaId): Pedido {
            if ($mesaId !== null) {
                /** @var Mesa $mesa */
                $mesa = Mesa::query()
                    ->whereKey($mesaId)
                    ->where('sede_id', $sedeId)
                    ->lockForUpdate()
                    ->firstOrFail();

                if (! $mesa->activa) {
                    throw ValidationException::withMessages([
                        'mesa_id' => 'La mesa está inactiva.',
                    ]);
                }

                $activo = Pedido::query()
                    ->where('mesa_id', $mesa->id)
                    ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
                    ->exists();

                if ($activo) {
                    throw ValidationException::withMessages([
                        'mesa_id' => 'Esta mesa ya tiene un pedido abierto.',
                    ]);
                }
            }

            $numero = ((int) Pedido::query()->where('sede_id', $sedeId)->max('numero')) + 1;

            return Pedido::query()->create([
                'sede_id' => $sedeId,
                'mesa_id' => $mesaId,
                'numero' => $numero,
                'estado' => Pedido::ESTADO_BORRADOR,
                'comensales' => max(1, (int) ($data['comensales'] ?? 1)),
                'canal' => $canal,
                'notas' => isset($data['notas']) ? trim((string) $data['notas']) ?: null : null,
                'subtotal' => 0,
                'descuento' => 0,
                'total' => 0,
                'opened_by' => Auth::id(),
            ]);
        });
    }

    public function agregarLinea(Pedido $pedido, array $data): PedidoLinea
    {
        $this->assertActivo($pedido);

        $productoId = (string) ($data['producto_id'] ?? '');
        $cantidad = round((float) ($data['cantidad'] ?? 1), 3);

        if ($cantidad <= 0) {
            throw ValidationException::withMessages([
                'cantidad' => 'La cantidad debe ser mayor a cero.',
            ]);
        }

        /** @var ProductoCarta $producto */
        $producto = ProductoCarta::query()
            ->whereKey($productoId)
            ->where('sede_id', $pedido->sede_id)
            ->where('activo', true)
            ->firstOrFail();

        $precio = round((float) $producto->precio, 2);
        $importe = round($precio * $cantidad, 2);
        $orden = ((int) $pedido->lineas()->max('orden')) + 1;

        $linea = $pedido->lineas()->create([
            'producto_id' => $producto->id,
            'area_id' => $producto->area_id,
            'nombre' => $producto->nombre,
            'precio_unitario' => $precio,
            'cantidad' => $cantidad,
            'importe' => $importe,
            'estado' => PedidoLinea::ESTADO_PENDIENTE,
            'notas' => isset($data['notas']) ? trim((string) $data['notas']) ?: null : null,
            'orden' => $orden,
        ]);

        $this->recalcularTotales($pedido);

        return $linea;
    }

    public function actualizarLinea(PedidoLinea $linea, array $data): PedidoLinea
    {
        $pedido = $linea->pedido;
        $this->assertActivo($pedido);

        if ($linea->estado !== PedidoLinea::ESTADO_PENDIENTE) {
            throw ValidationException::withMessages([
                'linea' => 'Solo puedes editar ítems pendientes de enviar a cocina.',
            ]);
        }

        if (array_key_exists('cantidad', $data)) {
            $cantidad = round((float) $data['cantidad'], 3);
            if ($cantidad <= 0) {
                throw ValidationException::withMessages([
                    'cantidad' => 'La cantidad debe ser mayor a cero.',
                ]);
            }
            $linea->cantidad = $cantidad;
            $linea->importe = round((float) $linea->precio_unitario * $cantidad, 2);
        }

        if (array_key_exists('notas', $data)) {
            $linea->notas = trim((string) $data['notas']) ?: null;
        }

        $linea->save();
        $this->recalcularTotales($pedido);

        return $linea;
    }

    public function anularLinea(PedidoLinea $linea): void
    {
        $pedido = $linea->pedido;
        $this->assertActivo($pedido);

        if ($linea->estado === PedidoLinea::ESTADO_ANULADO) {
            return;
        }

        // Solo pendientes: una vez enviado a cocina no se elimina desde salón.
        if ($linea->estado !== PedidoLinea::ESTADO_PENDIENTE) {
            throw ValidationException::withMessages([
                'linea' => 'No se puede eliminar: el ítem ya fue enviado a cocina. Coordina con el área.',
            ]);
        }

        $linea->estado = PedidoLinea::ESTADO_ANULADO;
        $linea->save();
        $this->recalcularTotales($pedido);
    }

    /**
     * Envía a cocina todas las líneas pendientes (o las indicadas).
     *
     * @param  list<string>|null  $lineaIds
     */
    public function enviarACocina(Pedido $pedido, ?array $lineaIds = null): int
    {
        $this->assertActivo($pedido);

        $query = $pedido->lineas()
            ->where('estado', PedidoLinea::ESTADO_PENDIENTE);

        if ($lineaIds !== null && $lineaIds !== []) {
            $query->whereIn('id', $lineaIds);
        }

        $lineas = $query->get();
        if ($lineas->isEmpty()) {
            throw ValidationException::withMessages([
                'pedido' => 'No hay ítems pendientes para enviar a cocina.',
            ]);
        }

        $now = now();
        foreach ($lineas as $linea) {
            $linea->estado = PedidoLinea::ESTADO_EN_COLA;
            $linea->enviado_at = $now;
            $linea->save();
        }

        if ($pedido->estado === Pedido::ESTADO_BORRADOR) {
            $pedido->estado = Pedido::ESTADO_ABIERTO;
        }
        if ($pedido->enviado_at === null) {
            $pedido->enviado_at = $now;
        }
        $pedido->save();

        return $lineas->count();
    }

    public function marcarLineaListo(PedidoLinea $linea): PedidoLinea
    {
        if ($linea->estado !== PedidoLinea::ESTADO_EN_COLA) {
            throw ValidationException::withMessages([
                'linea' => 'Solo se pueden marcar como listos los ítems en cola.',
            ]);
        }

        $linea->estado = PedidoLinea::ESTADO_LISTO;
        $linea->listo_at = now();
        $linea->save();

        return $linea;
    }

    public function anularPedido(Pedido $pedido): Pedido
    {
        $this->assertActivo($pedido);

        $enCola = $pedido->lineas()
            ->whereIn('estado', [PedidoLinea::ESTADO_EN_COLA, PedidoLinea::ESTADO_LISTO])
            ->exists();

        if ($enCola) {
            throw ValidationException::withMessages([
                'pedido' => 'No puedes anular el pedido: hay ítems en cocina o listos. Coordina con cocina o cobra el pedido.',
            ]);
        }

        $pedido->lineas()
            ->where('estado', PedidoLinea::ESTADO_PENDIENTE)
            ->update(['estado' => PedidoLinea::ESTADO_ANULADO]);

        $pedido->estado = Pedido::ESTADO_ANULADO;
        $pedido->cerrado_at = now();
        $pedido->save();
        $this->recalcularTotales($pedido);

        return $pedido;
    }

    public function recalcularTotales(Pedido $pedido): void
    {
        $subtotal = (float) $pedido->lineas()
            ->where('estado', '!=', PedidoLinea::ESTADO_ANULADO)
            ->sum('importe');

        $descuento = round((float) $pedido->descuento, 2);
        $subtotal = round($subtotal, 2);
        $total = max(0, round($subtotal - $descuento, 2));

        $pedido->forceFill([
            'subtotal' => $subtotal,
            'total' => $total,
        ])->save();
    }

    private function assertActivo(Pedido $pedido): void
    {
        if (! $pedido->isActivo()) {
            throw ValidationException::withMessages([
                'pedido' => 'Este pedido ya no está activo.',
            ]);
        }
    }
}

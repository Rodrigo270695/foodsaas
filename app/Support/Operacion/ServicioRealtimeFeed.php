<?php

namespace App\Support\Operacion;

use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Models\User;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Feed mesero ↔ cocina.
 * - Mesero: platos listos aún no llevados a mesa (entregado_at null).
 * - Cocina: ítems en cola esperando preparación.
 */
final class ServicioRealtimeFeed
{
    /**
     * @return array{
     *     enabled: bool,
     *     signature: string,
     *     listos: list<array<string, mixed>>,
     *     cola: list<array<string, mixed>>,
     *     cocina: array{en_cola: int, signature: string}|null
     * }|null
     */
    public static function forUser(?User $user): ?array
    {
        if ($user === null || tenant() === null) {
            return null;
        }

        try {
            if (! Schema::hasTable('ope_pedido_lineas') || ! Schema::hasTable('ope_pedidos')) {
                return null;
            }
        } catch (Throwable) {
            return null;
        }

        $canPedidos = $user->can('pedidos.view');
        $canCocina = $user->can('cocina.view');

        if (! $canPedidos && ! $canCocina) {
            return null;
        }

        $sedeId = ActiveSedeContext::id() ?? '';
        if ($sedeId === '') {
            return [
                'enabled' => true,
                'signature' => 'empty',
                'listos' => [],
                'cola' => [],
                'cocina' => $canCocina
                    ? ['en_cola' => 0, 'signature' => 'empty']
                    : null,
            ];
        }

        $listos = $canPedidos ? self::listosParaMesero($user->id, $sedeId) : [];
        $cola = $canCocina ? self::colaParaCocina($sedeId) : [];

        $cocina = null;
        if ($canCocina) {
            $ids = array_column($cola, 'id');
            $cocina = [
                'en_cola' => count($ids),
                'signature' => $ids === [] ? 'empty' : sha1(implode(',', $ids)),
            ];
        }

        $signature = sha1(json_encode([
            'listos' => array_column($listos, 'id'),
            'cola' => array_column($cola, 'id'),
        ], JSON_THROW_ON_ERROR));

        return [
            'enabled' => true,
            'signature' => $signature,
            'listos' => $listos,
            'cola' => $cola,
            'cocina' => $cocina,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function listosParaMesero(string $userId, string $sedeId): array
    {
        $query = PedidoLinea::query()
            ->with([
                'pedido:id,numero,mesa_id,opened_by,sede_id,estado',
                'pedido.mesa:id,codigo,nombre',
            ])
            ->where('estado', PedidoLinea::ESTADO_LISTO)
            ->where('listo_at', '>=', now()->subMinutes(90))
            ->whereHas('pedido', function ($q) use ($userId, $sedeId) {
                $q->where('sede_id', $sedeId)
                    ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
                    ->where(function ($inner) use ($userId) {
                        $inner->where('opened_by', $userId)
                            ->orWhereNull('opened_by');
                    });
            });

        if (Schema::hasColumn('ope_pedido_lineas', 'entregado_at')) {
            $query->whereNull('entregado_at');
        }

        $rows = $query
            ->orderByDesc('listo_at')
            ->limit(25)
            ->get(['id', 'pedido_id', 'nombre', 'cantidad', 'listo_at', 'area_id']);

        return $rows->map(static fn (PedidoLinea $linea): array => self::mapItem($linea))->values()->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function colaParaCocina(string $sedeId): array
    {
        $rows = PedidoLinea::query()
            ->with([
                'pedido:id,numero,mesa_id,opened_by,sede_id,estado',
                'pedido.mesa:id,codigo,nombre',
                'area:id,nombre',
            ])
            ->where('estado', PedidoLinea::ESTADO_EN_COLA)
            ->whereHas('pedido', function ($q) use ($sedeId) {
                $q->where('sede_id', $sedeId)
                    ->whereIn('estado', Pedido::ESTADOS_ACTIVOS);
            })
            ->orderBy('enviado_at')
            ->limit(40)
            ->get(['id', 'pedido_id', 'nombre', 'cantidad', 'enviado_at', 'area_id']);

        return $rows->map(static function (PedidoLinea $linea): array {
            $item = self::mapItem($linea);
            $item['enviado_at'] = optional($linea->enviado_at)?->toIso8601String();
            $item['area'] = $linea->area
                ? ['id' => $linea->area->id, 'nombre' => $linea->area->nombre]
                : null;

            return $item;
        })->values()->all();
    }

    /**
     * @return array<string, mixed>
     */
    private static function mapItem(PedidoLinea $linea): array
    {
        $pedido = $linea->pedido;
        $mesa = $pedido?->mesa;

        return [
            'id' => $linea->id,
            'pedido_id' => $linea->pedido_id,
            'numero' => $pedido?->numero,
            'nombre' => $linea->nombre,
            'cantidad' => (float) $linea->cantidad,
            'listo_at' => optional($linea->listo_at)?->toIso8601String(),
            'mesa' => $mesa
                ? [
                    'codigo' => $mesa->codigo,
                    'nombre' => $mesa->nombre,
                ]
                : null,
        ];
    }
}

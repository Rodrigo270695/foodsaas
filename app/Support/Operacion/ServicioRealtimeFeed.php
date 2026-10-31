<?php

namespace App\Support\Operacion;

use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Models\User;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Feed liviano para comunicación mesero ↔ cocina (estilo Agrovision inbox).
 * Se comparte por Inertia y se refresca con polling parcial.
 */
final class ServicioRealtimeFeed
{
    /**
     * @return array{
     *     enabled: bool,
     *     signature: string,
     *     listos: list<array<string, mixed>>,
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
                'cocina' => $canCocina
                    ? ['en_cola' => 0, 'signature' => 'empty']
                    : null,
            ];
        }

        $listos = [];
        if ($canPedidos) {
            $listos = self::listosParaMesero($user->id, $sedeId);
        }

        $cocina = null;
        if ($canCocina) {
            $cocina = self::cocinaSnapshot($sedeId);
        }

        $signature = sha1(json_encode([
            'listos' => array_column($listos, 'id'),
            'cocina' => $cocina['signature'] ?? null,
        ], JSON_THROW_ON_ERROR));

        return [
            'enabled' => true,
            'signature' => $signature,
            'listos' => $listos,
            'cocina' => $cocina,
        ];
    }

    /**
     * Ítems marcados listo recientemente en pedidos activos del mesero.
     *
     * @return list<array<string, mixed>>
     */
    private static function listosParaMesero(string $userId, string $sedeId): array
    {
        $rows = PedidoLinea::query()
            ->with([
                'pedido:id,numero,mesa_id,opened_by,sede_id,estado',
                'pedido.mesa:id,codigo,nombre',
            ])
            ->where('estado', PedidoLinea::ESTADO_LISTO)
            ->where('listo_at', '>=', now()->subMinutes(45))
            ->whereHas('pedido', function ($q) use ($userId, $sedeId) {
                $q->where('sede_id', $sedeId)
                    ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
                    ->where(function ($inner) use ($userId) {
                        $inner->where('opened_by', $userId)
                            ->orWhereNull('opened_by');
                    });
            })
            ->orderByDesc('listo_at')
            ->limit(25)
            ->get(['id', 'pedido_id', 'nombre', 'cantidad', 'listo_at', 'area_id']);

        return $rows->map(static function (PedidoLinea $linea): array {
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
        })->values()->all();
    }

    /**
     * @return array{en_cola: int, signature: string}
     */
    private static function cocinaSnapshot(string $sedeId): array
    {
        $ids = PedidoLinea::query()
            ->where('estado', PedidoLinea::ESTADO_EN_COLA)
            ->whereHas('pedido', function ($q) use ($sedeId) {
                $q->where('sede_id', $sedeId)
                    ->whereIn('estado', Pedido::ESTADOS_ACTIVOS);
            })
            ->orderBy('enviado_at')
            ->pluck('id')
            ->all();

        return [
            'en_cola' => count($ids),
            'signature' => $ids === [] ? 'empty' : sha1(implode(',', $ids)),
        ];
    }
}

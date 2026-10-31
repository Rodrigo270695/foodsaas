<?php

declare(strict_types=1);

namespace App\Services\Operacion;

use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Models\User;
use App\Services\Push\WebPushSender;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Push de sistema para mesero ↔ cocina (funciona con app minimizada / otra pestaña).
 */
final class ServicioPushNotifier
{
    public function __construct(private readonly WebPushSender $push) {}

    /**
     * Avisa a cocina: llegaron ítems nuevos a la cola.
     *
     * @param  list<PedidoLinea>  $lineas
     */
    public function notificarCocinaNuevos(Pedido $pedido, array $lineas): void
    {
        if ($lineas === [] || ! $this->push->isConfigured()) {
            return;
        }

        try {
            $mesa = $pedido->relationLoaded('mesa') ? $pedido->mesa : $pedido->mesa()->first();
            $mesaLabel = $mesa
                ? (trim((string) ($mesa->nombre ?? '')) ?: $mesa->codigo)
                : 'Mostrador';

            $nombres = collect($lineas)->pluck('nombre')->take(3)->implode(', ');
            $extra = count($lineas) > 3 ? '…' : '';

            $cooks = $this->usersWithPermission('cocina.view');

            $this->push->sendToUsers($cooks, [
                'title' => 'Nuevo pedido en cocina',
                'body' => "Pedido #{$pedido->numero} · {$mesaLabel}: {$nombres}{$extra}",
                'url' => '/cocina',
                'tag' => 'cocina-cola-'.$pedido->id,
            ]);
        } catch (Throwable $e) {
            Log::warning('ServicioPushNotifier cocina falló', ['error' => $e->getMessage()]);
        }
    }

    public function notificarMeseroListo(PedidoLinea $linea): void
    {
        if (! $this->push->isConfigured()) {
            return;
        }

        try {
            $linea->loadMissing(['pedido.mesa']);
            $pedido = $linea->pedido;
            if ($pedido === null) {
                return;
            }

            $targetId = $linea->enviado_por ?? $pedido->opened_by;
            if ($targetId === null) {
                return;
            }

            $mesa = $pedido->mesa;
            $mesaLabel = $mesa
                ? (trim((string) ($mesa->nombre ?? '')) ?: $mesa->codigo)
                : 'Mostrador';

            $this->push->sendToUsers([(int) $targetId], [
                'title' => 'Listo para servir',
                'body' => "{$linea->nombre} · Pedido #{$pedido->numero} · {$mesaLabel}",
                'url' => '/pedidos/'.$pedido->id,
                'tag' => 'listo-'.$linea->id,
            ]);
        } catch (Throwable $e) {
            Log::warning('ServicioPushNotifier listo falló', ['error' => $e->getMessage()]);
        }
    }

    /**
     * @return list<int>
     */
    private function usersWithPermission(string $permission): array
    {
        $tenantId = tenant_id();
        if ($tenantId === null || $tenantId === '') {
            return [];
        }

        $previous = getPermissionsTeamId();
        setPermissionsTeamId((string) $tenantId);

        try {
            return User::query()
                ->where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->permission($permission)
                ->pluck('id')
                ->map(static fn ($id) => (int) $id)
                ->all();
        } finally {
            setPermissionsTeamId($previous);
        }
    }
}

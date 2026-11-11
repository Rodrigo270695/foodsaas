<?php

declare(strict_types=1);

namespace App\Events\Operacion;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Ping liviano para que cocina/mesero refresquen feed/tablero vía Echo.
 */
final class ServicioOperacionUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(
        public readonly string $tenantId,
        public readonly string $sedeId,
        public readonly string $action,
        public readonly ?string $pedidoId = null,
        public readonly ?string $lineaId = null,
        public readonly ?int $actorId = null,
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel(
                'tenant.'.$this->tenantId.'.sede.'.$this->sedeId.'.servicio',
            ),
        ];
    }

    public function broadcastAs(): string
    {
        return 'servicio.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'pedido_id' => $this->pedidoId,
            'linea_id' => $this->lineaId,
            'actor_id' => $this->actorId,
            'sede_id' => $this->sedeId,
        ];
    }
}

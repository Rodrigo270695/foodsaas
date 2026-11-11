<?php

namespace App\Services\Delivery;

use App\Models\DeliveryExternoLog;
use App\Models\DeliveryIntegracion;
use App\Models\Pedido;
use App\Services\Operacion\PedidoService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeliveryExternoImportService
{
    public function __construct(
        private readonly PedidoService $pedidos,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function importar(
        string $proveedor,
        string $sedeId,
        array $payload,
        ?string $webhookSecret = null,
    ): DeliveryExternoLog {
        if (! in_array($proveedor, DeliveryIntegracion::PROVEEDORES, true)) {
            throw ValidationException::withMessages(['proveedor' => 'Proveedor no soportado.']);
        }

        $cfg = DeliveryIntegracion::query()
            ->where('sede_id', $sedeId)
            ->where('proveedor', $proveedor)
            ->where('activo', true)
            ->first();

        if ($cfg === null) {
            throw ValidationException::withMessages([
                'integracion' => 'Integración inactiva o no configurada para esta sede.',
            ]);
        }

        if ($cfg->webhook_secret && $webhookSecret !== null && ! hash_equals((string) $cfg->webhook_secret, $webhookSecret)) {
            throw ValidationException::withMessages(['webhook' => 'Firma inválida.']);
        }

        $externalId = (string) ($payload['external_id'] ?? $payload['id'] ?? $payload['order_id'] ?? '');
        if ($externalId === '') {
            throw ValidationException::withMessages(['external_id' => 'Falta el id externo del pedido.']);
        }

        $existing = DeliveryExternoLog::query()
            ->where('proveedor', $proveedor)
            ->where('external_id', $externalId)
            ->first();

        if ($existing?->pedido_id) {
            return $existing;
        }

        return DB::transaction(function () use ($proveedor, $sedeId, $payload, $externalId, $existing): DeliveryExternoLog {
            $cliente = trim((string) ($payload['customer_name'] ?? $payload['cliente'] ?? 'Cliente '.$proveedor));
            $telefono = trim((string) ($payload['phone'] ?? $payload['telefono'] ?? ''));
            $direccion = trim((string) ($payload['address'] ?? $payload['direccion'] ?? 'Sin dirección'));
            $notas = trim((string) ($payload['notes'] ?? $payload['notas'] ?? ''));

            $pedido = $this->pedidos->abrir($sedeId, [
                'canal' => Pedido::CANAL_DELIVERY,
                'comensales' => 1,
                'notas' => $notas !== '' ? mb_substr($notas, 0, 500) : null,
                'delivery_nombre' => mb_substr($cliente, 0, 180),
                'delivery_telefono' => $telefono !== '' ? mb_substr($telefono, 0, 40) : null,
                'delivery_direccion' => mb_substr($direccion, 0, 255),
                'delivery_estado' => Pedido::DELIVERY_RECIBIDO,
                'origen_externo' => $proveedor,
                'external_order_id' => $externalId,
            ]);

            $log = $existing ?? new DeliveryExternoLog;
            $log->fill([
                'sede_id' => $sedeId,
                'proveedor' => $proveedor,
                'external_id' => $externalId,
                'estado' => 'importado',
                'pedido_id' => $pedido->id,
                'payload' => $payload,
                'error_mensaje' => null,
            ]);
            $log->save();

            return $log;
        });
    }
}

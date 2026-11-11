<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels (cocina / mesero)
|--------------------------------------------------------------------------
| No lanzar excepciones: se convierten en 500 en /broadcasting/auth.
*/

Broadcast::channel(
    'tenant.{tenantId}.sede.{sedeId}.servicio',
    function (User $user, string $tenantId, string $sedeId): bool|array {
        try {
            if ($tenantId === '' || $sedeId === '') {
                return false;
            }

            if ((string) $user->tenant_id !== $tenantId) {
                return false;
            }

            if (! $user->can('cocina.view') && ! $user->can('pedidos.view')) {
                return false;
            }

            return [
                'id' => (string) $user->id,
                'name' => (string) $user->name,
            ];
        } catch (\Throwable) {
            return false;
        }
    },
);

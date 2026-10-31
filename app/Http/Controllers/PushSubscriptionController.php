<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Services\Push\WebPushSender;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Suscripción Web Push (mesero / cocina / caja en tablet o PWA).
 */
final class PushSubscriptionController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $count = PushSubscription::query()
            ->where('user_id', $user->id)
            ->count();

        return response()->json([
            'configured' => filled(config('webpush.vapid.public_key'))
                && filled(config('webpush.vapid.private_key')),
            'subscribed' => $count > 0,
            'count' => $count,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(filled(config('webpush.vapid.public_key')), 503);

        $user = $request->user();
        abort_unless($user !== null, 403);
        abort_unless($this->canUsePush($user), 403);

        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:2048'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'contentEncoding' => ['nullable', 'string', 'max:32'],
        ]);

        PushSubscription::query()->updateOrCreate(
            ['endpoint' => $data['endpoint']],
            [
                'user_id' => $user->id,
                'public_key' => $data['keys']['p256dh'],
                'auth_token' => $data['keys']['auth'],
                'content_encoding' => $data['contentEncoding'] ?? 'aes128gcm',
            ],
        );

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 403);
        abort_unless($this->canUsePush($user), 403);

        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:2048'],
        ]);

        PushSubscription::query()
            ->where('user_id', $user->id)
            ->where('endpoint', $data['endpoint'])
            ->delete();

        return response()->noContent();
    }

    /**
     * Envía un aviso de prueba al usuario actual (diagnóstico).
     */
    public function test(Request $request, WebPushSender $push): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);
        abort_unless($this->canUsePush($user), 403);
        abort_unless($push->isConfigured(), 503, 'VAPID no configurado en el servidor');

        $count = PushSubscription::query()->where('user_id', $user->id)->count();
        if ($count === 0) {
            return response()->json([
                'ok' => false,
                'message' => 'No hay suscripción guardada en el servidor. Desactiva y vuelve a Activar avisos.',
            ], 422);
        }

        $result = $push->sendToUsers([(int) $user->id], [
            'title' => 'Prueba FoodSaaS',
            'body' => 'Si ves esto, los avisos del sistema funcionan en este dispositivo.',
            'url' => '/pedidos',
            'tag' => 'foodsaas-push-test',
        ]);

        if ($result['sent'] < 1) {
            return response()->json([
                'ok' => false,
                'message' => $result['failed'] > 0
                    ? 'El servicio de push rechazó el envío. Revisa storage/logs/laravel.log'
                    : 'No se pudo enviar. Vuelve a Activar avisos del sistema.',
                'result' => $result,
            ], 422);
        }

        return response()->json([
            'ok' => true,
            'message' => 'Aviso de prueba enviado. Minimiza la ventana o mira el centro de notificaciones.',
            'result' => $result,
        ]);
    }

    private function canUsePush(\App\Models\User $user): bool
    {
        if ($user->tenant_id === null) {
            return true;
        }

        return $user->can('pedidos.view')
            || $user->can('cocina.view')
            || $user->can('caja.view');
    }
}

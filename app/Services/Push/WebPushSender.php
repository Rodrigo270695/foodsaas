<?php

declare(strict_types=1);

namespace App\Services\Push;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Throwable;

/**
 * Envío Web Push (PWA / tablet / móvil) para avisos de servicio.
 */
final class WebPushSender
{
    public function isConfigured(): bool
    {
        return filled(config('webpush.vapid.public_key'))
            && filled(config('webpush.vapid.private_key'))
            && class_exists(WebPush::class);
    }

    /**
     * @param  Collection<int, User>|list<int|string>  $usersOrIds
     * @param  array{title: string, body: string, url: string, tag: string}  $payload
     * @return array{sent: int, failed: int, missing_subs: bool}
     */
    public function sendToUsers(Collection|array $usersOrIds, array $payload): array
    {
        $empty = ['sent' => 0, 'failed' => 0, 'missing_subs' => true];

        if (! $this->isConfigured()) {
            Log::info('Web push omitido: VAPID no configurado', [
                'tag' => $payload['tag'] ?? 'unknown',
            ]);

            return $empty;
        }

        $ids = $usersOrIds instanceof Collection
            ? $usersOrIds->map(static fn ($u) => $u instanceof User ? (int) $u->id : (int) $u)->all()
            : array_map('intval', $usersOrIds);

        $ids = array_values(array_unique(array_filter($ids)));
        if ($ids === []) {
            Log::info('Web push omitido: sin destinatarios', [
                'tag' => $payload['tag'] ?? 'unknown',
            ]);

            return $empty;
        }

        $subscriptions = PushSubscription::query()
            ->whereIn('user_id', $ids)
            ->get();

        if ($subscriptions->isEmpty()) {
            Log::info('Web push omitido: usuarios sin suscripción en BD', [
                'tag' => $payload['tag'] ?? 'unknown',
                'user_ids' => $ids,
            ]);

            return $empty;
        }

        try {
            $webPush = new WebPush(
                [
                    'VAPID' => [
                        'subject' => (string) config('webpush.vapid.subject'),
                        'publicKey' => (string) config('webpush.vapid.public_key'),
                        'privateKey' => (string) config('webpush.vapid.private_key'),
                    ],
                ],
                ['TTL' => 300, 'urgency' => 'high'],
            );
        } catch (Throwable $e) {
            Log::error('Web push init failed', [
                'tag' => $payload['tag'] ?? 'unknown',
                'error' => $e->getMessage(),
            ]);

            return ['sent' => 0, 'failed' => 0, 'missing_subs' => false];
        }

        $json = json_encode($payload, JSON_THROW_ON_ERROR);

        foreach ($subscriptions as $subscription) {
            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->public_key,
                    'authToken' => $subscription->auth_token,
                    'contentEncoding' => $subscription->content_encoding ?: 'aes128gcm',
                ]),
                $json,
            );
        }

        $sent = 0;
        $failed = 0;

        foreach ($webPush->flush() as $report) {
            if ($report->isSuccess()) {
                $sent++;

                continue;
            }

            $failed++;
            $endpoint = $report->getRequest()?->getUri()?->__toString();
            $status = $report->getResponse()?->getStatusCode();

            Log::warning('Web push envío falló', [
                'tag' => $payload['tag'] ?? 'unknown',
                'reason' => $report->getReason(),
                'status' => $status,
                'expired' => $report->isSubscriptionExpired(),
                'endpoint' => is_string($endpoint) ? substr($endpoint, 0, 80) : null,
            ]);

            // Solo borrar si el push service dice que la suscripción ya no existe.
            if (
                $report->isSubscriptionExpired()
                && is_string($endpoint)
                && $endpoint !== ''
            ) {
                PushSubscription::query()->where('endpoint', $endpoint)->delete();
            }
        }

        Log::info('Web push flush', [
            'tag' => $payload['tag'] ?? 'unknown',
            'targets' => $subscriptions->count(),
            'sent' => $sent,
            'failed' => $failed,
        ]);

        return ['sent' => $sent, 'failed' => $failed, 'missing_subs' => false];
    }
}

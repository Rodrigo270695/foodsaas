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
     */
    public function sendToUsers(Collection|array $usersOrIds, array $payload): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        $ids = $usersOrIds instanceof Collection
            ? $usersOrIds->map(static fn ($u) => $u instanceof User ? (int) $u->id : (int) $u)->all()
            : array_map('intval', $usersOrIds);

        $ids = array_values(array_unique(array_filter($ids)));
        if ($ids === []) {
            return;
        }

        $subscriptions = PushSubscription::query()
            ->whereIn('user_id', $ids)
            ->get();

        if ($subscriptions->isEmpty()) {
            return;
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

            return;
        }

        $json = json_encode($payload, JSON_THROW_ON_ERROR);

        foreach ($subscriptions as $subscription) {
            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->public_key,
                    'authToken' => $subscription->auth_token,
                    'contentEncoding' => $subscription->content_encoding,
                ]),
                $json,
            );
        }

        foreach ($webPush->flush() as $report) {
            if ($report->isSuccess()) {
                continue;
            }

            $endpoint = $report->getRequest()?->getUri()?->__toString();
            if (is_string($endpoint) && $endpoint !== '') {
                PushSubscription::query()->where('endpoint', $endpoint)->delete();
            }
        }
    }
}

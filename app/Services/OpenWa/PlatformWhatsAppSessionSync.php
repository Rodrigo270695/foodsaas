<?php

declare(strict_types=1);

namespace App\Services\OpenWa;

use App\Models\PlatformWhatsAppSession;

final class PlatformWhatsAppSessionSync
{
    public function __construct(
        private readonly OpenWaClient $client,
    ) {}

    public function sessionName(): string
    {
        $name = trim((string) config('openwa.platform_session_name', 'foodsaas-platform'));

        return $name !== '' ? $name : 'foodsaas-platform';
    }

    public function current(): ?PlatformWhatsAppSession
    {
        return PlatformWhatsAppSession::query()
            ->where('openwa_session_name', $this->sessionName())
            ->first();
    }

    public function ensure(bool $wakeForLink = false): ?PlatformWhatsAppSession
    {
        if (! $this->client->isConfigured()) {
            return null;
        }

        $local = $this->current();
        $remote = null;

        if ($local !== null && $local->openwa_session_id !== '') {
            $remote = $this->client->tryGetSession($local->openwa_session_id);
        }

        if ($remote === null && $wakeForLink) {
            $remote = $this->client->createSession($this->sessionName());
        }

        if (! is_array($remote)) {
            return $local;
        }

        $sessionId = (string) ($remote['id'] ?? '');
        if ($sessionId === '') {
            return $local;
        }

        $status = (string) ($remote['status'] ?? 'created');

        if ($wakeForLink && in_array($status, ['created', 'disconnected', 'failed'], true)) {
            try {
                $this->client->startSession($sessionId);
                $remote = $this->client->tryGetSession($sessionId) ?? $remote;
                $status = (string) ($remote['status'] ?? $status);
            } catch (\Throwable $e) {
                $remote['last_error'] = $e->getMessage();
            }
        }

        return $this->store($sessionId, $remote, $status, $local);
    }

    public function refresh(PlatformWhatsAppSession $session): PlatformWhatsAppSession
    {
        $remote = $this->client->getSession($session->openwa_session_id);

        return $this->store(
            (string) ($remote['id'] ?? $session->openwa_session_id),
            $remote,
            (string) ($remote['status'] ?? $session->status),
            $session,
        );
    }

    public function disconnect(PlatformWhatsAppSession $session): PlatformWhatsAppSession
    {
        $this->client->stopSession($session->openwa_session_id);

        $session->forceFill([
            'status' => 'disconnected',
            'last_synced_at' => now(),
            'last_error' => null,
        ])->save();

        return $session->refresh();
    }

    /**
     * @param  array<string, mixed>  $remote
     */
    private function store(string $sessionId, array $remote, string $status, ?PlatformWhatsAppSession $local): PlatformWhatsAppSession
    {
        $phone = isset($remote['phone']) ? (string) $remote['phone'] : $local?->phone;
        $wasReady = $local?->isReady() ?? false;

        $session = PlatformWhatsAppSession::query()->updateOrCreate(
            ['openwa_session_name' => $this->sessionName()],
            [
                'openwa_session_id' => $sessionId,
                'status' => $status !== '' ? $status : 'created',
                'phone' => $phone !== '' ? $phone : null,
                'push_name' => isset($remote['pushName']) ? (string) $remote['pushName'] : $local?->push_name,
                'connected_at' => $status === PlatformWhatsAppSession::STATUS_READY
                    ? ($local?->connected_at ?? now())
                    : ($wasReady ? null : $local?->connected_at),
                'last_synced_at' => now(),
                'last_error' => isset($remote['last_error']) ? (string) $remote['last_error'] : null,
            ],
        );

        return $session;
    }
}

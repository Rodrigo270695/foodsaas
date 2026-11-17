<?php

declare(strict_types=1);

namespace App\Services\OpenWa;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cliente mínimo de OpenWA para la sesión de plataforma del superadmin.
 */
final class OpenWaClient
{
    public function isConfigured(): bool
    {
        return (bool) config('openwa.enabled')
            && trim((string) config('openwa.api_url', '')) !== ''
            && trim((string) config('openwa.api_key', '')) !== '';
    }

    /**
     * @return array<string, mixed>
     */
    public function createSession(string $name): array
    {
        $response = $this->request('post', '/api/sessions', [
            'name' => $name,
            'config' => ['autoReconnect' => true],
        ]);

        return $this->sessionPayload($response, 'OpenWA no devolvió la sesión.');
    }

    /**
     * @return array<string, mixed>
     */
    public function getSession(string $sessionId): array
    {
        $response = $this->request('get', '/api/sessions/'.$sessionId);

        return $this->sessionPayload($response, 'Sesión OpenWA no encontrada.');
    }

    /**
     * @return array<string, mixed>|null
     */
    public function tryGetSession(string $sessionId): ?array
    {
        if (trim($sessionId) === '') {
            return null;
        }

        try {
            return $this->getSession($sessionId);
        } catch (RuntimeException) {
            return null;
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function startSession(string $sessionId): array
    {
        $response = $this->request('post', '/api/sessions/'.$sessionId.'/start');

        return is_array($response) ? $response : [];
    }

    /**
     * @return array<string, mixed>
     */
    public function getQrCode(string $sessionId): array
    {
        $response = $this->request('get', '/api/sessions/'.$sessionId.'/qr');

        if (! is_array($response)) {
            throw new RuntimeException('OpenWA no devolvió el código QR.');
        }

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    public function stopSession(string $sessionId): array
    {
        $response = $this->request('post', '/api/sessions/'.$sessionId.'/stop');

        return is_array($response) ? $response : [];
    }

    /**
     * @return array<string, mixed>
     */
    public function sendText(string $sessionId, string $chatId, string $text): array
    {
        $response = $this->request('post', '/api/sessions/'.$sessionId.'/messages/send-text', [
            'chatId' => $chatId,
            'text' => $text,
        ]);

        if (! is_array($response)) {
            throw new RuntimeException('OpenWA no confirmó el envío.');
        }

        return $response;
    }

    /**
     * @param  array<string, mixed>|null  $body
     */
    private function request(string $method, string $path, ?array $body = null): mixed
    {
        $apiKey = trim((string) config('openwa.api_key', ''));
        $base = rtrim((string) config('openwa.api_url', ''), '/');

        if ($apiKey === '' || $base === '') {
            throw new RuntimeException('OpenWA no está configurado. Revisa OPENWA_API_URL y OPENWA_API_KEY.');
        }

        try {
            $pending = Http::timeout(max(5, (int) config('openwa.timeout_seconds', 20)))
                ->acceptJson()
                ->withHeaders(['X-API-Key' => $apiKey]);

            $response = match ($method) {
                'get' => $pending->get($base.$path),
                'post' => $pending->post($base.$path, $body ?? []),
                default => throw new RuntimeException('Método no soportado.'),
            };
        } catch (ConnectionException $e) {
            throw new RuntimeException('Error de red con OpenWA: '.$e->getMessage(), 0, $e);
        }

        if (! $response->successful()) {
            throw new RuntimeException('OpenWA HTTP '.$response->status().': '.$response->body());
        }

        $json = $response->json();

        return is_array($json) ? $json : [];
    }

    /**
     * @return array<string, mixed>
     */
    private function sessionPayload(mixed $response, string $emptyMessage): array
    {
        if (! is_array($response)) {
            throw new RuntimeException($emptyMessage);
        }

        if (isset($response['session']) && is_array($response['session'])) {
            return $response['session'];
        }

        if (isset($response['data']) && is_array($response['data'])) {
            return $response['data'];
        }

        return $response;
    }
}

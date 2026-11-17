<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\PlatformWhatsAppSession;
use App\Services\OpenWa\OpenWaClient;
use App\Services\OpenWa\PlatformWhatsAppSessionSync;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlatformWhatsAppController extends Controller
{
    public function index(OpenWaClient $client, PlatformWhatsAppSessionSync $sync): Response
    {
        return Inertia::render('plataforma/whatsapp/index', [
            'configured' => $client->isConfigured(),
            'session_name' => $sync->sessionName(),
            'session' => $this->present($sync->current()),
        ]);
    }

    public function sync(PlatformWhatsAppSessionSync $sync): RedirectResponse
    {
        try {
            $session = $sync->ensure(wakeForLink: true);
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', 'OpenWA no respondió. Revisa la URL y la API key, y vuelve a intentar.');
        }

        if ($session?->isReady()) {
            return back()->with('success', 'WhatsApp de plataforma conectado.');
        }

        return back()->with('info', 'Sesión lista para escanear. El código QR aparece en esta pantalla.');
    }

    public function qr(OpenWaClient $client, PlatformWhatsAppSessionSync $sync): JsonResponse
    {
        abort_unless($client->isConfigured(), 503, 'OpenWA no está configurado.');

        try {
            $session = $sync->ensure(wakeForLink: true);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'ready' => false,
                'qr_code' => null,
                'error' => 'No se pudo abrir la sesión de OpenWA.',
            ], 503);
        }

        abort_if($session === null, 422, 'No se pudo crear la sesión.');

        if ($session->isReady()) {
            return response()->json([
                'ready' => true,
                'status' => $session->status,
                'phone' => $session->phone,
                'session' => $this->present($session),
            ]);
        }

        try {
            $qr = $client->getQrCode($session->openwa_session_id);
            $code = $qr['qrCode'] ?? $qr['qr'] ?? null;

            return response()->json([
                'ready' => false,
                'status' => (string) ($qr['status'] ?? $session->status),
                'qr_code' => is_string($code) && $code !== '' ? $code : null,
                'message' => is_string($code) && $code !== '' ? null : 'Esperando el código QR…',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ready' => false,
                'status' => $session->status,
                'qr_code' => null,
                'message' => 'Iniciando sesión. El QR aparece en unos segundos.',
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function logout(PlatformWhatsAppSessionSync $sync): RedirectResponse
    {
        $session = $sync->current();
        abort_if($session === null, 422, 'No hay WhatsApp de plataforma vinculado.');

        try {
            $sync->disconnect($session);
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', 'No se pudo desvincular WhatsApp.');
        }

        return back()->with('success', 'WhatsApp de plataforma desvinculado.');
    }

    public function test(Request $request, OpenWaClient $client, PlatformWhatsAppSessionSync $sync): RedirectResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
            'message' => ['required', 'string', 'max:500'],
        ]);

        $session = $sync->current();
        abort_if($session === null || ! $session->isReady(), 422, 'Vincula WhatsApp antes de enviar una prueba.');

        $digits = preg_replace('/\D+/', '', (string) $data['phone']) ?? '';
        abort_if(strlen($digits) < 8, 422, 'El número de prueba no es válido.');

        if (! str_starts_with($digits, '51') && strlen($digits) === 9) {
            $digits = '51'.$digits;
        }

        try {
            $client->sendText($session->openwa_session_id, $digits.'@c.us', (string) $data['message']);
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', 'OpenWA no envió el mensaje de prueba.');
        }

        return back()->with('success', 'Mensaje de prueba enviado.');
    }

    /**
     * @return array<string, mixed>|null
     */
    private function present(?PlatformWhatsAppSession $session): ?array
    {
        if ($session === null) {
            return null;
        }

        return [
            'status' => $session->status,
            'phone' => $session->phone,
            'push_name' => $session->push_name,
            'is_ready' => $session->isReady(),
            'last_error' => $session->last_error,
            'last_synced_at' => $session->last_synced_at?->toIso8601String(),
        ];
    }
}

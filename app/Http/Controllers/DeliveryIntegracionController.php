<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\DeliveryExternoLog;
use App\Models\DeliveryIntegracion;
use App\Services\Delivery\DeliveryExternoImportService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DeliveryIntegracionController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    public function index(): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $integraciones = DeliveryIntegracion::query()
            ->where('sede_id', $sedeId)
            ->get()
            ->keyBy('proveedor');

        $logs = DeliveryExternoLog::query()
            ->where('sede_id', $sedeId)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get(['id', 'proveedor', 'external_id', 'estado', 'pedido_id', 'error_mensaje', 'created_at']);

        return Inertia::render('delivery/integraciones', [
            'integraciones' => collect(DeliveryIntegracion::PROVEEDORES)->map(function (string $prov) use ($integraciones, $sedeId) {
                $row = $integraciones->get($prov);

                return [
                    'proveedor' => $prov,
                    'activo' => (bool) ($row?->activo ?? false),
                    'store_id' => $row?->store_id,
                    'has_api_key' => filled($row?->api_key),
                    'has_webhook_secret' => filled($row?->webhook_secret),
                    'webhook_url' => url('/webhooks/delivery/'.$prov.'/'.$sedeId),
                ];
            }),
            'logs' => $logs,
        ]);
    }

    public function upsert(Request $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $data = $request->validate([
            'proveedor' => ['required', Rule::in(DeliveryIntegracion::PROVEEDORES)],
            'activo' => ['required', 'boolean'],
            'api_key' => ['nullable', 'string', 'max:255'],
            'api_secret' => ['nullable', 'string', 'max:255'],
            'store_id' => ['nullable', 'string', 'max:120'],
            'webhook_secret' => ['nullable', 'string', 'max:255'],
        ]);

        $row = DeliveryIntegracion::query()->firstOrNew([
            'sede_id' => $sedeId,
            'proveedor' => $data['proveedor'],
        ]);

        $row->activo = (bool) $data['activo'];
        $row->store_id = $data['store_id'] ?? null;
        if (array_key_exists('api_key', $data) && $data['api_key'] !== null && $data['api_key'] !== '') {
            $row->api_key = $data['api_key'];
        }
        if (array_key_exists('api_secret', $data) && $data['api_secret'] !== null && $data['api_secret'] !== '') {
            $row->api_secret = $data['api_secret'];
        }
        if (array_key_exists('webhook_secret', $data) && $data['webhook_secret'] !== null && $data['webhook_secret'] !== '') {
            $row->webhook_secret = $data['webhook_secret'];
        }
        $row->save();

        return back()->with('success', 'Integración '.$data['proveedor'].' guardada.');
    }

    public function webhook(
        Request $request,
        string $proveedor,
        string $sede,
        DeliveryExternoImportService $service,
    ): JsonResponse {
        try {
            $log = $service->importar(
                $proveedor,
                $sede,
                $request->all(),
                $request->header('X-Webhook-Secret') ?? $request->string('webhook_secret')->toString() ?: null,
            );
        } catch (\Throwable $e) {
            DeliveryExternoLog::query()->create([
                'sede_id' => $sede,
                'proveedor' => $proveedor,
                'external_id' => (string) ($request->input('external_id') ?? $request->input('id') ?? uniqid('err_', true)),
                'estado' => 'error',
                'payload' => $request->all(),
                'error_mensaje' => mb_substr($e->getMessage(), 0, 2000),
            ]);

            return response()->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'ok' => true,
            'pedido_id' => $log->pedido_id,
            'external_id' => $log->external_id,
        ]);
    }

    public function importManual(Request $request, DeliveryExternoImportService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $data = $request->validate([
            'proveedor' => ['required', Rule::in(DeliveryIntegracion::PROVEEDORES)],
            'external_id' => ['required', 'string', 'max:120'],
            'cliente' => ['required', 'string', 'max:180'],
            'telefono' => ['nullable', 'string', 'max:40'],
            'direccion' => ['required', 'string', 'max:255'],
            'notas' => ['nullable', 'string', 'max:500'],
        ]);

        $log = $service->importar($data['proveedor'], $sedeId, [
            'external_id' => $data['external_id'],
            'cliente' => $data['cliente'],
            'telefono' => $data['telefono'] ?? null,
            'direccion' => $data['direccion'],
            'notas' => $data['notas'] ?? null,
        ]);

        return redirect()
            ->route('pedidos.show', $log->pedido_id)
            ->with('success', 'Pedido externo importado.');
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\FelDocument;
use App\Models\FelSerie;
use App\Services\Fel\FelNotaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class FelNotaController extends Controller
{
    use ResolvesTenantId;

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $tipo = (int) $request->integer('tipo', 0);

        $query = FelDocument::query()
            ->with(['documentoAfectado:id,numero_completo,tipo_comprobante'])
            ->whereIn('tipo_comprobante', [
                FelSerie::TIPO_NOTA_CREDITO,
                FelSerie::TIPO_NOTA_DEBITO,
                FelSerie::TIPO_GUIA_REMISION,
            ])
            ->orderByDesc('created_at');

        if (in_array($tipo, [
            FelSerie::TIPO_NOTA_CREDITO,
            FelSerie::TIPO_NOTA_DEBITO,
            FelSerie::TIPO_GUIA_REMISION,
        ], true)) {
            $query->where('tipo_comprobante', $tipo);
        }

        $docs = $query->paginate(20)->withQueryString()->through(fn (FelDocument $d) => [
            'id' => $d->id,
            'tipo' => $d->tipo_comprobante,
            'tipo_label' => FelSerie::labelTipo((int) $d->tipo_comprobante),
            'numero' => $d->numero_completo,
            'estado' => $d->estado,
            'total' => (float) $d->total,
            'afectado' => $d->documentoAfectado?->numero_completo,
            'motivo' => $d->nota_motivo_descripcion,
            'emitido_at' => $d->emitido_at?->toIso8601String(),
            'error' => $d->error_mensaje,
            'pdf' => $d->url_pdf,
        ]);

        $cpes = FelDocument::query()
            ->where('estado', FelDocument::ESTADO_EMITIDO)
            ->whereIn('tipo_comprobante', [FelSerie::TIPO_BOLETA, FelSerie::TIPO_FACTURA])
            ->orderByDesc('emitido_at')
            ->limit(50)
            ->get(['id', 'numero_completo', 'tipo_comprobante', 'total', 'receptor_nombre']);

        return Inertia::render('facturacion/notas/index', [
            'documentos' => $docs,
            'filters' => ['tipo' => $tipo],
            'cpes' => $cpes->map(fn (FelDocument $d) => [
                'id' => $d->id,
                'numero' => $d->numero_completo,
                'tipo' => FelSerie::labelTipo((int) $d->tipo_comprobante),
                'total' => (float) $d->total,
                'receptor' => $d->receptor_nombre,
            ]),
        ]);
    }

    public function storeNota(Request $request, FelNotaService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $data = $request->validate([
            'documento_afectado_id' => ['required', 'uuid', Rule::exists('fel_documents', 'id')],
            'tipo' => ['required', Rule::in(['credito', 'debito'])],
            'motivo_codigo' => ['required', 'string', 'max:10'],
            'motivo_descripcion' => ['required', 'string', 'max:250'],
            'monto' => ['nullable', 'numeric', 'gt:0'],
        ]);

        $afectado = FelDocument::query()->findOrFail($data['documento_afectado_id']);

        try {
            $doc = $data['tipo'] === 'credito'
                ? $service->emitirNotaCredito(
                    $afectado,
                    $data['motivo_codigo'],
                    $data['motivo_descripcion'],
                    isset($data['monto']) ? (float) $data['monto'] : null,
                )
                : $service->emitirNotaDebito(
                    $afectado,
                    $data['motivo_codigo'],
                    $data['motivo_descripcion'],
                    (float) ($data['monto'] ?? $afectado->total),
                );
        } catch (RuntimeException $e) {
            return back()->withErrors(['nota' => $e->getMessage()]);
        }

        return back()->with(
            'success',
            FelSerie::labelTipo((int) $doc->tipo_comprobante).' '.$doc->numero_completo.' generada ('.$doc->estado.').',
        );
    }

    public function storeGuia(Request $request, FelNotaService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $data = $request->validate([
            'destinatario' => ['required', 'string', 'max:200'],
            'direccion_partida' => ['nullable', 'string', 'max:250'],
            'direccion_llegada' => ['required', 'string', 'max:250'],
            'transportista' => ['nullable', 'string', 'max:180'],
            'placa' => ['nullable', 'string', 'max:20'],
            'peso_kg' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.descripcion' => ['required', 'string', 'max:250'],
            'items.*.cantidad' => ['required', 'numeric', 'gt:0'],
            'items.*.unidad' => ['nullable', 'string', 'max:20'],
        ]);

        try {
            $doc = $service->emitirGuiaRemision($data);
        } catch (RuntimeException $e) {
            return back()->withErrors(['guia' => $e->getMessage()]);
        }

        return back()->with('success', 'Guía '.$doc->numero_completo.' generada ('.$doc->estado.').');
    }
}

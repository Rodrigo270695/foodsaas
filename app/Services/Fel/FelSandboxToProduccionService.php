<?php

declare(strict_types=1);

namespace App\Services\Fel;

use App\Models\FelDocument;
use App\Models\RestaurantSetting;
use App\Models\Venta;
use App\Support\Fel\ApisunatCredentialResolver;
use App\Support\Fel\FelDocumentApisunatModeResolver;
use App\Support\Fel\FelReceptorResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Reenvía a APISUNAT producción un CPE emitido por error en sandbox,
 * conservando la misma serie y correlativo, en orden estricto.
 */
final class FelSandboxToProduccionService
{
    /** @var array<string, int>|null */
    private ?array $siguientesCache = null;

    public function __construct(
        private readonly ApisunatClient $apisunat,
    ) {}

    public function esSandboxEmitido(FelDocument $document): bool
    {
        if ($document->estado !== FelDocument::ESTADO_EMITIDO) {
            return false;
        }

        return FelDocumentApisunatModeResolver::resolveAndPersist($document) === 'sandbox';
    }

    /**
     * Menor correlativo sandbox pendiente por serie.
     *
     * @return array<string, int> serie => correlativo
     */
    public function siguientesPendientesPorSerie(): array
    {
        if ($this->siguientesCache !== null) {
            return $this->siguientesCache;
        }

        $docs = FelDocument::query()
            ->where('estado', FelDocument::ESTADO_EMITIDO)
            ->orderBy('serie')
            ->orderBy('correlativo')
            ->get(['id', 'serie', 'correlativo', 'apisunat_mode', 'apisunat_payload', 'url_pdf', 'url_xml', 'url_cdr', 'enlace_consulta', 'nubefact_id']);

        $out = [];
        foreach ($docs as $doc) {
            $mode = FelDocumentApisunatModeResolver::resolveAndPersist($doc);
            if ($mode !== 'sandbox') {
                continue;
            }
            $serie = (string) $doc->serie;
            if (! isset($out[$serie])) {
                $out[$serie] = (int) $doc->correlativo;
            }
        }

        return $this->siguientesCache = $out;
    }

    public function puedePasarAProduccion(FelDocument $document, ?RestaurantSetting $cfg = null): bool
    {
        try {
            $this->assertPuedePasar($document, $cfg ?? RestaurantSetting::current());

            return true;
        } catch (ValidationException) {
            return false;
        }
    }

    /**
     * @return array{puede: bool, motivo: ?string, siguiente_numero: ?string}
     */
    public function estadoConversion(FelDocument $document, ?RestaurantSetting $cfg = null): array
    {
        $cfg ??= RestaurantSetting::current();
        $siguientes = $this->siguientesPendientesPorSerie();
        $serie = (string) $document->serie;
        $siguienteCorr = $siguientes[$serie] ?? null;
        $siguienteNumero = $siguienteCorr !== null
            ? $serie.'-'.str_pad((string) $siguienteCorr, 8, '0', STR_PAD_LEFT)
            : null;

        try {
            $this->assertPuedePasar($document, $cfg);

            return [
                'puede' => true,
                'motivo' => null,
                'siguiente_numero' => $siguienteNumero,
            ];
        } catch (ValidationException $e) {
            $messages = $e->errors();
            $first = collect($messages)->flatten()->first();

            return [
                'puede' => false,
                'motivo' => is_string($first) ? $first : null,
                'siguiente_numero' => $siguienteNumero,
            ];
        }
    }

    public function convertir(FelDocument $document): FelDocument
    {
        $cfg = RestaurantSetting::current();
        $this->assertPuedePasar($document, $cfg);

        $credenciales = ApisunatCredentialResolver::fromRestaurantSetting($cfg);
        $credenciales['mode'] = 'produccion';

        return DB::transaction(function () use ($document, $cfg, $credenciales): FelDocument {
            $documento = FelDocument::query()
                ->whereKey($document->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertPuedePasar($documento, $cfg);

            $venta = Venta::query()
                ->with(['pedido.lineas'])
                ->whereKey($documento->venta_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($venta->estado !== Venta::ESTADO_PAGADA) {
                throw ValidationException::withMessages([
                    'fel' => __('facturacion.fel.sandbox_prod.venta_no_pagada'),
                ]);
            }

            $receptor = [
                'tipo_doc' => (int) $documento->receptor_tipo_doc,
                'num_doc' => (string) $documento->receptor_num_doc,
                'nombre' => (string) $documento->receptor_nombre,
            ];
            if ($receptor['num_doc'] === '' || $receptor['nombre'] === '') {
                $receptor = FelReceptorResolver::desdeVenta($venta);
            }

            $payload = $this->apisunat->construirPayload(
                $venta,
                $cfg,
                (int) $documento->tipo_comprobante,
                (string) $documento->serie,
                (int) $documento->correlativo,
                $receptor,
            );

            try {
                $respuesta = $this->apisunat->generarComprobante($credenciales, $payload);
            } catch (RuntimeException $e) {
                throw ValidationException::withMessages([
                    'fel' => $e->getMessage(),
                ]);
            }

            if (! $this->apisunat->respuestaExitosa($respuesta)) {
                throw ValidationException::withMessages([
                    'fel' => $this->apisunat->extraerMensajeError($respuesta),
                ]);
            }

            $enlaces = $this->apisunat->extraerEnlaces($respuesta);
            $estadoApisunat = strtoupper((string) (($respuesta['payload'] ?? [])['estado'] ?? ''));
            $mapped = match ($estadoApisunat) {
                'ACEPTADO' => [
                    'doc' => FelDocument::ESTADO_EMITIDO,
                    'venta' => Venta::FEL_EMITIDO,
                ],
                'PENDIENTE' => [
                    'doc' => FelDocument::ESTADO_PENDIENTE,
                    'venta' => Venta::FEL_PENDIENTE,
                ],
                'RECHAZADO', 'EXCEPCION' => [
                    'doc' => FelDocument::ESTADO_RECHAZADO,
                    'venta' => Venta::FEL_RECHAZADO,
                ],
                default => [
                    'doc' => FelDocument::ESTADO_PENDIENTE,
                    'venta' => Venta::FEL_PENDIENTE,
                ],
            };

            $documento->update([
                'estado' => $mapped['doc'],
                'nubefact_id' => $estadoApisunat !== '' ? 'apisunat:'.$estadoApisunat : $documento->nubefact_id,
                'url_pdf' => $enlaces['pdf'] ?? $documento->url_pdf,
                'url_xml' => $enlaces['xml'] ?? $documento->url_xml,
                'url_cdr' => $enlaces['cdr'] ?? $documento->url_cdr,
                'enlace_consulta' => $enlaces['consulta'] ?? $documento->enlace_consulta,
                'apisunat_payload' => $respuesta,
                'apisunat_mode' => 'produccion',
                'error_mensaje' => in_array($estadoApisunat, ['RECHAZADO', 'EXCEPCION'], true)
                    ? mb_substr((string) ($respuesta['message'] ?? 'APISUNAT: '.$estadoApisunat), 0, 2000)
                    : null,
                'emitido_at' => $documento->emitido_at ?? now(),
            ]);

            $venta->update(['fel_estado' => $mapped['venta']]);

            $this->siguientesCache = null;

            return $documento->fresh() ?? $documento;
        });
    }

    private function assertPuedePasar(FelDocument $document, RestaurantSetting $cfg): void
    {
        if ($document->estado !== FelDocument::ESTADO_EMITIDO) {
            throw ValidationException::withMessages([
                'fel' => __('facturacion.fel.sandbox_prod.solo_emitidos'),
            ]);
        }

        $mode = FelDocumentApisunatModeResolver::resolveAndPersist($document);
        if ($mode !== 'sandbox') {
            throw ValidationException::withMessages([
                'fel' => __('facturacion.fel.sandbox_prod.solo_sandbox'),
            ]);
        }

        if (! ApisunatCredentialResolver::estaConfigurado($cfg)) {
            throw ValidationException::withMessages([
                'fel' => __('facturacion.fel.apisunat_no_configurado'),
            ]);
        }

        if (($cfg->apisunat_mode ?? 'sandbox') !== 'produccion') {
            throw ValidationException::withMessages([
                'fel' => __('facturacion.fel.sandbox_prod.restaurante_debe_produccion'),
            ]);
        }

        $siguientes = $this->siguientesPendientesPorSerie();
        $serie = (string) $document->serie;
        $esperado = $siguientes[$serie] ?? null;
        if ($esperado === null) {
            throw ValidationException::withMessages([
                'fel' => __('facturacion.fel.sandbox_prod.sin_pendientes'),
            ]);
        }

        if ((int) $document->correlativo !== (int) $esperado) {
            $numero = $serie.'-'.str_pad((string) $esperado, 8, '0', STR_PAD_LEFT);
            throw ValidationException::withMessages([
                'fel' => __('facturacion.fel.sandbox_prod.fuera_de_orden', [
                    'numero' => $numero,
                    'serie' => $serie,
                ]),
            ]);
        }
    }
}

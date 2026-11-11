<?php

declare(strict_types=1);

namespace App\Services\Fel;

use App\Models\FelDocument;
use App\Models\FelSerie;
use App\Models\RestaurantSetting;
use App\Support\Fel\ApisunatCredentialResolver;
use App\Support\Fel\FelSerieResolver;
use App\Support\Plan\PlanCapabilities;
use App\Tenancy\TenantManager;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Emite notas de crédito/débito y guías de remisión.
 */
final class FelNotaService
{
    public function __construct(
        private readonly ApisunatClient $apisunat,
        private readonly FelSerieResolver $felSeries,
    ) {}

    public function emitirNotaCredito(
        FelDocument $afectado,
        string $motivoCodigo,
        string $motivoDescripcion,
        ?float $monto = null,
    ): FelDocument {
        return $this->emitirNota(
            $afectado,
            FelSerie::TIPO_NOTA_CREDITO,
            $motivoCodigo,
            $motivoDescripcion,
            $monto,
        );
    }

    public function emitirNotaDebito(
        FelDocument $afectado,
        string $motivoCodigo,
        string $motivoDescripcion,
        float $monto,
    ): FelDocument {
        return $this->emitirNota(
            $afectado,
            FelSerie::TIPO_NOTA_DEBITO,
            $motivoCodigo,
            $motivoDescripcion,
            $monto,
        );
    }

    /**
     * @param  array{
     *     destinatario: string,
     *     direccion_partida?: string,
     *     direccion_llegada: string,
     *     transportista?: string,
     *     placa?: string,
     *     peso_kg?: float|null,
     *     items: list<array{descripcion: string, cantidad: float, unidad?: string}>
     * }  $guia
     */
    public function emitirGuiaRemision(array $guia): FelDocument
    {
        $cfg = RestaurantSetting::query()->first();
        if ($cfg === null) {
            throw new RuntimeException('Configura el restaurante antes de emitir guías.');
        }

        $tenant = app(TenantManager::class)->current()?->tenant;
        if (! PlanCapabilities::guiasRemision($tenant)) {
            throw new RuntimeException('Tu plan no incluye guías de remisión.');
        }

        if (! ApisunatCredentialResolver::estaConfigurado($cfg)) {
            throw new RuntimeException('Configura las credenciales APISUNAT.');
        }

        $items = $guia['items'] ?? [];
        if ($items === []) {
            throw new RuntimeException('La guía requiere al menos un ítem.');
        }

        return DB::transaction(function () use ($cfg, $guia, $items): FelDocument {
            $serie = $this->felSeries->resolverParaTipo(FelSerie::TIPO_GUIA_REMISION, true);
            $correlativo = ((int) $serie->ultimo_correlativo) + 1;
            $numeroCompleto = $serie->serie.'-'.str_pad((string) $correlativo, 8, '0', STR_PAD_LEFT);
            $credenciales = ApisunatCredentialResolver::fromRestaurantSetting($cfg);

            $payload = [
                'documento' => 'guia_remision',
                'serie' => $serie->serie,
                'numero' => $correlativo,
                'fecha_de_emision' => now()->format('Y-m-d'),
                'destinatario' => $guia['destinatario'],
                'direccion_partida' => $guia['direccion_partida'] ?? ($cfg->direccion ?? '-'),
                'direccion_llegada' => $guia['direccion_llegada'],
                'transportista' => $guia['transportista'] ?? null,
                'placa' => $guia['placa'] ?? null,
                'peso_kg' => $guia['peso_kg'] ?? null,
                'items' => array_map(static fn (array $it): array => [
                    'descripcion' => mb_substr((string) $it['descripcion'], 0, 250),
                    'cantidad' => number_format((float) $it['cantidad'], 3, '.', ''),
                    'unidad_de_medida' => $it['unidad'] ?? 'NIU',
                ], $items),
            ];

            $doc = FelDocument::query()->create([
                'venta_id' => null,
                'fel_serie_id' => $serie->id,
                'tipo_comprobante' => FelSerie::TIPO_GUIA_REMISION,
                'serie' => $serie->serie,
                'correlativo' => $correlativo,
                'numero_completo' => $numeroCompleto,
                'receptor_tipo_doc' => 6,
                'receptor_num_doc' => (string) ($cfg->ruc ?? '00000000000'),
                'receptor_nombre' => mb_substr((string) $guia['destinatario'], 0, 200),
                'subtotal' => 0,
                'igv_monto' => 0,
                'total' => 0,
                'moneda' => (string) ($cfg->moneda ?? 'PEN'),
                'estado' => FelDocument::ESTADO_PENDIENTE,
                'apisunat_mode' => $credenciales['mode'],
                'guia_datos' => $guia,
            ]);

            $serie->update(['ultimo_correlativo' => $correlativo]);

            try {
                $respuesta = $this->apisunat->generarComprobante($credenciales, $payload);
                $this->aplicarRespuesta($doc, $respuesta, $credenciales['mode']);
            } catch (RuntimeException $e) {
                $doc->update([
                    'estado' => FelDocument::ESTADO_RECHAZADO,
                    'error_mensaje' => mb_substr($e->getMessage(), 0, 2000),
                ]);
            }

            return $doc->fresh();
        });
    }

    private function emitirNota(
        FelDocument $afectado,
        int $tipoNota,
        string $motivoCodigo,
        string $motivoDescripcion,
        ?float $monto,
    ): FelDocument {
        if ($afectado->estado !== FelDocument::ESTADO_EMITIDO) {
            throw new RuntimeException('Solo se puede referenciar un CPE emitido.');
        }

        if (! in_array($afectado->tipo_comprobante, [FelSerie::TIPO_BOLETA, FelSerie::TIPO_FACTURA], true)) {
            throw new RuntimeException('La nota debe referenciar boleta o factura.');
        }

        $cfg = RestaurantSetting::query()->first();
        if ($cfg === null) {
            throw new RuntimeException('Configura el restaurante.');
        }

        $tenant = app(TenantManager::class)->current()?->tenant;
        if ($tipoNota === FelSerie::TIPO_NOTA_CREDITO && ! PlanCapabilities::notasCredito($tenant)) {
            throw new RuntimeException('Tu plan no incluye notas de crédito.');
        }
        if ($tipoNota === FelSerie::TIPO_NOTA_DEBITO && ! PlanCapabilities::notasDebito($tenant)) {
            throw new RuntimeException('Tu plan no incluye notas de débito.');
        }

        if (! ApisunatCredentialResolver::estaConfigurado($cfg)) {
            throw new RuntimeException('Configura las credenciales APISUNAT.');
        }

        $total = $monto !== null ? round($monto, 2) : (float) $afectado->total;
        if ($total <= 0) {
            throw new RuntimeException('El monto debe ser mayor a cero.');
        }
        if ($tipoNota === FelSerie::TIPO_NOTA_CREDITO && $total > (float) $afectado->total) {
            throw new RuntimeException('La nota de crédito no puede superar el total del CPE.');
        }

        $sedeId = $afectado->felSerie?->sede_id
            ?? $afectado->venta?->sede_id
            ?? null;

        return DB::transaction(function () use (
            $afectado,
            $tipoNota,
            $motivoCodigo,
            $motivoDescripcion,
            $total,
            $cfg,
            $sedeId,
        ): FelDocument {
            $serie = $this->felSeries->resolverParaTipo($tipoNota, true, $sedeId ? (string) $sedeId : null);
            $correlativo = ((int) $serie->ultimo_correlativo) + 1;
            $numeroCompleto = $serie->serie.'-'.str_pad((string) $correlativo, 8, '0', STR_PAD_LEFT);

            $igvPct = $cfg->igvPorcentajeEfectivo();
            if ($igvPct > 0 && (bool) $cfg->precio_incluye_igv) {
                $subtotal = round($total / (1 + ($igvPct / 100)), 2);
                $igv = round($total - $subtotal, 2);
            } else {
                $subtotal = $total;
                $igv = 0.0;
            }

            $credenciales = ApisunatCredentialResolver::fromRestaurantSetting($cfg);
            $payload = [
                'documento' => $this->apisunat->nombreDocumentoTipo($tipoNota),
                'serie' => $serie->serie,
                'numero' => $correlativo,
                'fecha_de_emision' => now()->format('Y-m-d'),
                'hora_de_emision' => now()->format('H:i:s'),
                'moneda' => (string) ($afectado->moneda ?: 'PEN'),
                'cliente_tipo_de_documento' => (string) $afectado->receptor_tipo_doc,
                'cliente_numero_de_documento' => $afectado->receptor_num_doc,
                'cliente_denominacion' => $afectado->receptor_nombre,
                'documento_que_se_modifica_tipo' => $this->apisunat->nombreDocumentoTipo((int) $afectado->tipo_comprobante),
                'documento_que_se_modifica_serie' => $afectado->serie,
                'documento_que_se_modifica_numero' => $afectado->correlativo,
                'tipo_de_nota' => $motivoCodigo,
                'motivo' => $motivoDescripcion,
                'total' => number_format($total, 2, '.', ''),
                'items' => [[
                    'unidad_de_medida' => 'NIU',
                    'descripcion' => mb_substr($motivoDescripcion, 0, 250),
                    'cantidad' => '1.000000',
                    'valor_unitario' => number_format($subtotal, 6, '.', ''),
                    'porcentaje_igv' => number_format($igvPct, 0, '.', ''),
                    'codigo_tipo_afectacion_igv' => '10',
                    'nombre_tributo' => 'IGV',
                ]],
            ];

            $doc = FelDocument::query()->create([
                'venta_id' => $afectado->venta_id,
                'documento_afectado_id' => $afectado->id,
                'nota_motivo_codigo' => $motivoCodigo,
                'nota_motivo_descripcion' => $motivoDescripcion,
                'fel_serie_id' => $serie->id,
                'tipo_comprobante' => $tipoNota,
                'serie' => $serie->serie,
                'correlativo' => $correlativo,
                'numero_completo' => $numeroCompleto,
                'receptor_tipo_doc' => $afectado->receptor_tipo_doc,
                'receptor_num_doc' => $afectado->receptor_num_doc,
                'receptor_nombre' => $afectado->receptor_nombre,
                'subtotal' => $subtotal,
                'igv_monto' => $igv,
                'total' => $total,
                'moneda' => $afectado->moneda,
                'estado' => FelDocument::ESTADO_PENDIENTE,
                'apisunat_mode' => $credenciales['mode'],
            ]);

            $serie->update(['ultimo_correlativo' => $correlativo]);

            try {
                $respuesta = $this->apisunat->generarComprobante($credenciales, $payload);
                $this->aplicarRespuesta($doc, $respuesta, $credenciales['mode']);
            } catch (RuntimeException $e) {
                $doc->update([
                    'estado' => FelDocument::ESTADO_RECHAZADO,
                    'error_mensaje' => mb_substr($e->getMessage(), 0, 2000),
                ]);
            }

            return $doc->fresh();
        });
    }

    /**
     * @param  array<string, mixed>  $respuesta
     */
    private function aplicarRespuesta(FelDocument $doc, array $respuesta, string $mode): void
    {
        if (! $this->apisunat->respuestaExitosa($respuesta)) {
            $doc->update([
                'estado' => FelDocument::ESTADO_RECHAZADO,
                'error_mensaje' => mb_substr($this->apisunat->extraerMensajeError($respuesta), 0, 2000),
                'apisunat_payload' => $respuesta,
                'apisunat_mode' => $mode,
            ]);

            return;
        }

        $enlaces = $this->apisunat->extraerEnlaces($respuesta);
        $estadoApisunat = strtoupper((string) (($respuesta['payload'] ?? [])['estado'] ?? ''));
        $emitido = $estadoApisunat === 'ACEPTADO' || $estadoApisunat === '';

        $doc->update([
            'estado' => $emitido ? FelDocument::ESTADO_EMITIDO : FelDocument::ESTADO_PENDIENTE,
            'nubefact_id' => $estadoApisunat !== '' ? 'apisunat:'.$estadoApisunat : null,
            'url_pdf' => $enlaces['pdf'],
            'url_xml' => $enlaces['xml'],
            'url_cdr' => $enlaces['cdr'],
            'enlace_consulta' => $enlaces['consulta'],
            'apisunat_payload' => $respuesta,
            'apisunat_mode' => $mode,
            'error_mensaje' => null,
            'emitido_at' => $emitido ? now() : null,
        ]);
    }
}

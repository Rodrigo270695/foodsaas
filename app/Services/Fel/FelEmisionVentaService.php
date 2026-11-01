<?php

declare(strict_types=1);

namespace App\Services\Fel;

use App\Models\FelDocument;
use App\Models\FelSerie;
use App\Models\RestaurantSetting;
use App\Models\Tenant;
use App\Models\Venta;
use App\Support\Fel\ApisunatCredentialResolver;
use App\Support\Fel\FelReceptorResolver;
use App\Support\Fel\FelSerieResolver;
use App\Support\Plan\PlanCapabilities;
use App\Tenancy\TenantManager;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class FelEmisionVentaService
{
    public function __construct(
        private readonly ApisunatClient $apisunat,
        private readonly FelSerieResolver $felSeries,
    ) {}

    public function puedeEmitir(?Tenant $tenant, RestaurantSetting $cfg, Venta $venta): bool
    {
        if ($venta->estado !== Venta::ESTADO_PAGADA) {
            return false;
        }

        if (! $this->estadoPermiteEmision($venta)) {
            return false;
        }

        $tipo = FelReceptorResolver::tipoSunatDesdeString((string) $venta->tipo_comprobante);

        return FelSerie::esTipoSunat($tipo)
            && $this->planPermiteTipo($tenant, $tipo)
            && (bool) $cfg->emite_comprobantes_sunat
            && ApisunatCredentialResolver::estaConfigurado($cfg);
    }

    public function emitir(Venta $venta): FelDocument
    {
        $cfg = RestaurantSetting::query()->first();
        if ($cfg === null) {
            throw new RuntimeException('Configura el restaurante antes de emitir comprobantes.');
        }

        $tenant = app(TenantManager::class)->current()?->tenant;

        if (! $this->puedeEmitir($tenant, $cfg, $venta)) {
            throw new RuntimeException('Esta venta no puede emitir CPE (revisa tipo, plan, token y estado FEL).');
        }

        $credenciales = ApisunatCredentialResolver::fromRestaurantSetting($cfg);
        $emisionModo = $credenciales['mode'];
        $receptor = FelReceptorResolver::desdeVenta($venta);
        $tipoComprobante = FelReceptorResolver::tipoSunatDesdeString((string) $venta->tipo_comprobante);
        if ($tipoComprobante === null) {
            throw new RuntimeException('Tipo de comprobante no es boleta ni factura.');
        }

        if ($tipoComprobante === FelSerie::TIPO_FACTURA && (int) $receptor['tipo_doc'] !== 6) {
            throw new RuntimeException('La factura requiere RUC (11 dígitos) del cliente.');
        }

        return DB::transaction(function () use ($venta, $cfg, $credenciales, $receptor, $tipoComprobante, $emisionModo): FelDocument {
            $venta = Venta::query()->whereKey($venta->id)->lockForUpdate()->firstOrFail();
            $venta->loadMissing(['pedido.lineas']);

            if (! $this->estadoPermiteEmision($venta)) {
                throw new RuntimeException('La venta ya tiene un CPE en proceso o emitido.');
            }

            $serie = $this->felSeries->resolverParaVenta($venta, $tipoComprobante, true);
            $correlativo = ((int) $serie->ultimo_correlativo) + 1;
            $numeroCompleto = $serie->serie.'-'.str_pad((string) $correlativo, 8, '0', STR_PAD_LEFT);

            $igvPct = $cfg->igvPorcentajeEfectivo();
            $total = round((float) $venta->total, 2);
            if ($igvPct > 0 && (bool) $cfg->precio_incluye_igv) {
                $subtotal = round($total / (1 + ($igvPct / 100)), 2);
                $igv = round($total - $subtotal, 2);
            } else {
                $subtotal = round((float) $venta->subtotal, 2);
                $igv = round(max(0, $total - $subtotal), 2);
            }

            $documento = FelDocument::query()->updateOrCreate(
                ['venta_id' => $venta->id],
                [
                    'fel_serie_id' => $serie->id,
                    'tipo_comprobante' => $tipoComprobante,
                    'serie' => $serie->serie,
                    'correlativo' => $correlativo,
                    'numero_completo' => $numeroCompleto,
                    'receptor_tipo_doc' => $receptor['tipo_doc'],
                    'receptor_num_doc' => $receptor['num_doc'],
                    'receptor_nombre' => $receptor['nombre'],
                    'subtotal' => $subtotal,
                    'igv_monto' => $igv,
                    'total' => $total,
                    'moneda' => (string) ($cfg->moneda ?? 'PEN'),
                    'estado' => FelDocument::ESTADO_PENDIENTE,
                    'error_mensaje' => null,
                    'emitido_at' => null,
                    'apisunat_mode' => $emisionModo,
                ],
            );

            $venta->update([
                'fel_document_id' => $documento->id,
                'fel_estado' => Venta::FEL_PENDIENTE,
            ]);

            $payload = $this->apisunat->construirPayload(
                $venta,
                $cfg,
                $tipoComprobante,
                $serie->serie,
                $correlativo,
                $receptor,
            );

            try {
                $respuesta = $this->apisunat->generarComprobante($credenciales, $payload);
            } catch (RuntimeException $e) {
                $this->marcarRechazado($documento, $venta, $e->getMessage(), $emisionModo);

                throw $e;
            }

            if (! $this->apisunat->respuestaExitosa($respuesta)) {
                $mensaje = $this->apisunat->extraerMensajeError($respuesta);
                $this->marcarRechazado($documento, $venta, $mensaje, $emisionModo);

                throw new RuntimeException($mensaje);
            }

            $enlaces = $this->apisunat->extraerEnlaces($respuesta);
            $estadoApisunat = strtoupper((string) (($respuesta['payload'] ?? [])['estado'] ?? ''));

            if (in_array($estadoApisunat, ['RECHAZADO', 'EXCEPCION'], true)) {
                $mensaje = $this->apisunat->extraerMensajeError($respuesta);
                $this->marcarRechazado($documento, $venta, $mensaje, $emisionModo);

                throw new RuntimeException($mensaje !== '' ? $mensaje : 'APISUNAT rechazó el comprobante.');
            }

            $mapped = match ($estadoApisunat) {
                'ACEPTADO' => [
                    'doc' => FelDocument::ESTADO_EMITIDO,
                    'venta' => Venta::FEL_EMITIDO,
                ],
                default => [
                    'doc' => FelDocument::ESTADO_PENDIENTE,
                    'venta' => Venta::FEL_PENDIENTE,
                ],
            };

            $serie->update(['ultimo_correlativo' => $correlativo]);

            $documento->update([
                'estado' => $mapped['doc'],
                'nubefact_id' => $estadoApisunat !== '' ? 'apisunat:'.$estadoApisunat : null,
                'url_pdf' => $enlaces['pdf'],
                'url_xml' => $enlaces['xml'],
                'url_cdr' => $enlaces['cdr'],
                'enlace_consulta' => $enlaces['consulta'],
                'apisunat_payload' => $respuesta,
                'apisunat_mode' => $emisionModo,
                'error_mensaje' => null,
                'emitido_at' => $mapped['doc'] === FelDocument::ESTADO_EMITIDO ? now() : null,
            ]);

            $venta->update(['fel_estado' => $mapped['venta']]);

            return $documento->fresh();
        });
    }

    private function estadoPermiteEmision(Venta $venta): bool
    {
        $estado = (string) ($venta->fel_estado ?? Venta::FEL_SIN_CPE);

        if ($estado === Venta::FEL_RECHAZADO) {
            return true;
        }

        if ($estado === Venta::FEL_PENDIENTE) {
            $doc = $venta->relationLoaded('felDocument')
                ? $venta->felDocument
                : FelDocument::query()->where('venta_id', $venta->id)->first();

            if ($doc !== null && filled($doc->serie) && $doc->correlativo !== null) {
                return false;
            }

            return true;
        }

        $tipo = FelReceptorResolver::tipoSunatDesdeString((string) $venta->tipo_comprobante);

        return $estado === Venta::FEL_SIN_CPE && FelSerie::esTipoSunat($tipo);
    }

    private function planPermiteTipo(?Tenant $tenant, ?int $tipo): bool
    {
        return match ($tipo) {
            FelSerie::TIPO_FACTURA => PlanCapabilities::facturasElectronicas($tenant),
            FelSerie::TIPO_BOLETA => PlanCapabilities::boletasElectronicas($tenant),
            default => false,
        };
    }

    private function marcarRechazado(FelDocument $documento, Venta $venta, string $mensaje, ?string $emisionModo = null): void
    {
        $documento->update([
            'estado' => FelDocument::ESTADO_RECHAZADO,
            'error_mensaje' => mb_substr($mensaje, 0, 2000),
            'apisunat_mode' => in_array($emisionModo, ['sandbox', 'produccion'], true)
                ? $emisionModo
                : $documento->apisunat_mode,
        ]);
        $venta->update(['fel_estado' => Venta::FEL_RECHAZADO]);
    }
}

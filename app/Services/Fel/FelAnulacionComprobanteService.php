<?php

declare(strict_types=1);

namespace App\Services\Fel;

use App\Models\FelDocument;
use App\Models\FelSerie;
use App\Models\RestaurantSetting;
use App\Models\Venta;
use App\Support\Fel\ApisunatCredentialResolver;
use App\Support\Plan\PlanCapabilities;
use App\Tenancy\TenantManager;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Anulación del CPE en SUNAT vía Lucode (APISUNAT v3).
 *
 * - Factura → POST /api/v3/voided
 * - Boleta → POST /api/v3/daily-summary (anular)
 */
final class FelAnulacionComprobanteService
{
    public function __construct(
        private readonly ApisunatClient $apisunat,
    ) {}

    public function requiereAnulacionSunat(Venta $venta): bool
    {
        $venta->loadMissing('felDocument');

        return $venta->fel_estado === Venta::FEL_EMITIDO
            && $venta->felDocument !== null
            && $venta->felDocument->estado === FelDocument::ESTADO_EMITIDO;
    }

    public function anularEnSunat(Venta $venta): void
    {
        if (! $this->requiereAnulacionSunat($venta)) {
            return;
        }

        $cfg = RestaurantSetting::current();
        $tenant = app(TenantManager::class)->current()?->tenant;

        if (! PlanCapabilities::facturaElectronica($tenant)
            || ! (bool) $cfg->emite_comprobantes_sunat
            || ! ApisunatCredentialResolver::estaConfigurado($cfg)) {
            throw new RuntimeException(
                'No se puede anular el CPE: falta configuración APISUNAT o el plan no incluye facturación electrónica.',
            );
        }

        $documento = $venta->felDocument;
        if ($documento === null) {
            throw new RuntimeException('La venta no tiene documento electrónico asociado.');
        }

        $credenciales = ApisunatCredentialResolver::fromRestaurantSetting($cfg);
        $tipo = (int) $documento->tipo_comprobante;
        $serie = (string) $documento->serie;
        $numero = (int) $documento->correlativo;
        $motivo = 'ANULACIÓN DE OPERACIÓN';

        try {
            $respuesta = match ($tipo) {
                FelSerie::TIPO_FACTURA => $this->apisunat->comunicarBaja(
                    $credenciales,
                    'factura',
                    $serie,
                    $numero,
                    $motivo,
                ),
                FelSerie::TIPO_BOLETA => $this->apisunat->anularBoletaResumen(
                    $credenciales,
                    $serie,
                    $numero,
                ),
                default => throw new RuntimeException(
                    'Este tipo de comprobante no se puede anular por SUNAT desde aquí.',
                ),
            };
        } catch (RuntimeException $e) {
            throw new RuntimeException(
                'SUNAT/Lucode rechazó la anulación: '.$e->getMessage(),
                0,
                $e,
            );
        }

        if (! $this->apisunat->respuestaExitosa($respuesta)) {
            throw new RuntimeException(
                'SUNAT/Lucode rechazó la anulación: '.$this->apisunat->extraerMensajeError($respuesta),
            );
        }

        DB::transaction(function () use ($documento, $venta): void {
            $documento->update([
                'estado' => FelDocument::ESTADO_ANULADO,
                'anulado_at' => now(),
            ]);
            $venta->update(['fel_estado' => Venta::FEL_ANULADO]);
        });
    }
}

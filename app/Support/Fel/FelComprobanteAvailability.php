<?php

declare(strict_types=1);

namespace App\Support\Fel;

use App\Models\FelSerie;
use App\Models\RestaurantSetting;
use App\Models\Venta;
use App\Support\Plan\PlanCapabilities;
use App\Tenancy\TenantManager;

/**
 * Qué tipos de comprobante se pueden ofrecer/emitir en la sede activa.
 */
final class FelComprobanteAvailability
{
    /**
     * @return array{
     *     tipos: list<string>,
     *     apisunat_configurado: bool,
     *     emite_comprobantes_sunat: bool,
     *     serie_boleta: bool,
     *     serie_factura: bool,
     *     plan_boleta: bool,
     *     plan_factura: bool,
     * }
     */
    public static function forSede(string $sedeId): array
    {
        $cfg = RestaurantSetting::tableReady()
            ? RestaurantSetting::query()->first()
            : null;

        $tenant = app(TenantManager::class)->current()?->tenant;
        $emiteFlag = (bool) ($cfg?->emite_comprobantes_sunat);
        $tokenOk = $cfg !== null && ApisunatCredentialResolver::estaConfigurado($cfg);
        $planBoleta = PlanCapabilities::boletasElectronicas($tenant);
        $planFactura = PlanCapabilities::facturasElectronicas($tenant);

        $serieBoleta = false;
        $serieFactura = false;
        if ($sedeId !== '') {
            try {
                $serieBoleta = FelSerie::query()
                    ->where('sede_id', $sedeId)
                    ->where('tipo_comprobante', FelSerie::TIPO_BOLETA)
                    ->where('activo', true)
                    ->exists();
                $serieFactura = FelSerie::query()
                    ->where('sede_id', $sedeId)
                    ->where('tipo_comprobante', FelSerie::TIPO_FACTURA)
                    ->where('activo', true)
                    ->exists();
            } catch (\Throwable) {
                $serieBoleta = false;
                $serieFactura = false;
            }
        }

        $tipos = [Venta::TIPO_TICKET];
        if ($emiteFlag && $tokenOk && $planBoleta && $serieBoleta) {
            $tipos[] = Venta::TIPO_BOLETA;
        }
        if ($emiteFlag && $tokenOk && $planFactura && $serieFactura) {
            $tipos[] = Venta::TIPO_FACTURA;
        }

        return [
            'tipos' => $tipos,
            'apisunat_configurado' => $tokenOk,
            'emite_comprobantes_sunat' => $emiteFlag,
            'serie_boleta' => $serieBoleta,
            'serie_factura' => $serieFactura,
            'plan_boleta' => $planBoleta,
            'plan_factura' => $planFactura,
        ];
    }

    public static function assertPuedeEmitir(string $sedeId, string $tipo): void
    {
        if ($tipo === Venta::TIPO_TICKET) {
            return;
        }

        $info = self::forSede($sedeId);
        if (! in_array($tipo, $info['tipos'], true)) {
            $faltas = [];
            if (! $info['emite_comprobantes_sunat']) {
                $faltas[] = 'activa “Emite comprobantes SUNAT” en Configuración › General';
            }
            if (! $info['apisunat_configurado']) {
                $faltas[] = 'configura el token APISUNAT (un superadmin de plataforma)';
            }
            if ($tipo === Venta::TIPO_BOLETA && ! $info['serie_boleta']) {
                $faltas[] = 'crea una serie de boleta activa para esta sede (Facturación › Series)';
            }
            if ($tipo === Venta::TIPO_FACTURA && ! $info['serie_factura']) {
                $faltas[] = 'crea una serie de factura activa para esta sede (Facturación › Series)';
            }
            if ($tipo === Venta::TIPO_BOLETA && ! $info['plan_boleta']) {
                $faltas[] = 'tu plan no incluye boletas electrónicas';
            }
            if ($tipo === Venta::TIPO_FACTURA && ! $info['plan_factura']) {
                $faltas[] = 'tu plan no incluye facturas electrónicas';
            }

            $detalle = $faltas !== []
                ? implode('; ', $faltas)
                : 'revisa la configuración de facturación electrónica';

            throw \Illuminate\Validation\ValidationException::withMessages([
                'tipo_comprobante' => 'No se puede emitir '.$tipo.': '.$detalle.'.',
            ]);
        }
    }
}

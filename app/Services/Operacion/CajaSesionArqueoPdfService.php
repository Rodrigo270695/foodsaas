<?php

declare(strict_types=1);

namespace App\Services\Operacion;

use App\Models\CajaSesion;
use App\Models\RestaurantSetting;
use App\Models\Tenant;
use App\Support\Caja\CajaBilleteras;
use App\Support\Caja\TicketAnchoMm;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;

/**
 * PDF imprimible del arqueo de una sesión de caja (A4 o ticket térmico).
 */
final class CajaSesionArqueoPdfService
{
    public function __construct(
        private readonly CajaSesionArqueoService $arqueoService,
    ) {}

    /**
     * Vista HTML del arqueo térmico (preview limpio en modal; sin visor PDF).
     *
     * @param  array<string, mixed>|null  $arqueo
     */
    public function ticketHtml(
        CajaSesion $sesion,
        string $tenantId,
        string $formato,
        ?array $arqueo = null,
        bool $autoPrint = false,
    ): View {
        $data = $this->ticketViewData($sesion, $tenantId, $formato, $arqueo);
        $data['auto_print'] = $autoPrint;

        return view('operacion.caja-sesion-arqueo-ticket', $data);
    }

    /**
     * @param  array<string, mixed>|null  $arqueo
     * @param  string  $formato  'a4' o ancho de ticket ('56'|'57'|'58'|'80')
     */
    public function stream(
        CajaSesion $sesion,
        string $tenantId,
        ?array $arqueo = null,
        string $formato = 'a4',
    ): Response {
        $safeId = substr((string) $sesion->getKey(), 0, 8);
        $label = $formato === 'a4' ? 'a4' : $formato.'mm';
        $binary = $this->output($sesion, $tenantId, $arqueo, $formato);

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="arqueo-caja-'.$safeId.'-'.$label.'.pdf"',
            'Cache-Control' => 'private, max-age=120',
        ]);
    }

    /**
     * Binario PDF (para caché en el controlador).
     *
     * @param  array<string, mixed>|null  $arqueo
     */
    public function output(
        CajaSesion $sesion,
        string $tenantId,
        ?array $arqueo = null,
        string $formato = 'a4',
    ): string {
        if ($formato === 'a4') {
            $baseData = $this->baseViewData($sesion, $tenantId, $arqueo);
            $pdf = Pdf::loadView('pdf.caja-sesion-arqueo', $baseData)->setPaper('a4');
            $this->applyDomPdfOptions($pdf);

            return $pdf->output();
        }

        $ticketData = $this->ticketViewData($sesion, $tenantId, $formato, $arqueo);
        $ancho = (string) $ticketData['ancho_mm'];
        $widthPt = ((float) TicketAnchoMm::printableMm($ancho)) * 72 / 25.4;
        $arqueoResolved = is_array($ticketData['arqueo'] ?? null) ? $ticketData['arqueo'] : [];
        $metodosCount = is_array($arqueoResolved['metodos'] ?? null) ? count($arqueoResolved['metodos']) : 0;
        $billeterasCount = is_array($arqueoResolved['billeteras'] ?? null) ? count($arqueoResolved['billeteras']) : 0;
        $heightPt = max(460.0, 300.0 + ($metodosCount * 24.0) + ($billeterasCount * 52.0) + 180.0);

        $pdf = Pdf::loadView('pdf.caja-sesion-arqueo-ticket', $ticketData);
        $pdf->setPaper([0, 0, $widthPt, $heightPt], 'portrait');
        $this->applyDomPdfOptions($pdf);

        return $pdf->output();
    }

    private function applyDomPdfOptions(\Barryvdh\DomPDF\PDF $pdf): void
    {
        $pdf->setOption('isHtml5ParserEnabled', true);
        $pdf->setOption('isRemoteEnabled', false);
        $pdf->setOption('defaultFont', 'DejaVu Sans');
        $pdf->setOption('dpi', 96);
        $pdf->setOption('isFontSubsettingEnabled', true);
    }

    /**
     * @param  array<string, mixed>|null  $arqueo
     * @return array<string, mixed>
     */
    private function baseViewData(CajaSesion $sesion, string $tenantId, ?array $arqueo = null): array
    {
        $arqueo = $this->resolveArqueo($sesion, $arqueo);
        $cfg = RestaurantSetting::tableReady() ? RestaurantSetting::query()->first() : null;
        $tenant = Tenant::query()->find($tenantId);

        $nombre = $cfg?->nombre_comercial
            ?: $cfg?->razon_social
            ?: $tenant?->nombre_comercial
            ?: $tenant?->razon_social
            ?: config('app.name');

        $colorPrimario = $this->sanitizeHex($cfg?->color_primario, '#660033');
        $branding = $this->resolveContrastColors($colorPrimario);

        return [
            'arqueo' => $arqueo,
            'sesion' => $sesion,
            'clinic_nombre' => $nombre,
            'clinic_ruc' => $cfg?->ruc ?: $tenant?->ruc,
            'clinic_direccion' => $cfg?->direccion,
            'clinic_telefono' => $cfg?->telefono,
            'logoDataUri' => $this->resolveLogoDataUri($cfg),
            'colorPrimario' => $branding['primary'],
            'colorSecundario' => $branding['secondary'],
            'colorOnPrimary' => $branding['on_primary'],
            'colorText' => $branding['text'],
            'colorMuted' => $branding['muted'],
            'abierta_por' => $sesion->openedBy?->name,
            'cerrada_por' => $sesion->closedBy?->name,
            'notas_cierre' => $sesion->notas_cierre,
        ];
    }

    /**
     * @param  array<string, mixed>|null  $arqueo
     * @return array<string, mixed>
     */
    private function ticketViewData(
        CajaSesion $sesion,
        string $tenantId,
        string $formato,
        ?array $arqueo = null,
    ): array {
        $baseData = $this->baseViewData($sesion, $tenantId, $arqueo);
        $cfg = RestaurantSetting::tableReady() ? RestaurantSetting::query()->first() : null;
        $anchoFallback = $cfg !== null ? $cfg->ticket_ancho_mm : TicketAnchoMm::DEFAULT;
        $ancho = TicketAnchoMm::normalize($formato, $anchoFallback);

        return array_merge($baseData, [
            'ancho_mm' => $ancho,
            'printable_mm' => TicketAnchoMm::printableMm($ancho),
            'tf' => TicketAnchoMm::typography($ancho),
        ]);
    }

    /**
     * Normaliza query `formato`: a4 | 56 | 57 | 58 | 80.
     */
    public static function normalizeFormato(?string $value, ?string $ticketFallback = null): string
    {
        $v = $value !== null ? trim($value) : '';
        if ($v === 'a4' || $v === 'A4') {
            return 'a4';
        }

        if (in_array($v, TicketAnchoMm::ALLOWED, true)) {
            return $v;
        }

        // Sin formato explícito: A4 (reporte general).
        if ($v === '') {
            return 'a4';
        }

        return TicketAnchoMm::normalize($v, $ticketFallback);
    }

    /**
     * @param  array<string, mixed>|null  $arqueo
     * @return array<string, mixed>
     */
    private function resolveArqueo(CajaSesion $sesion, ?array $arqueo): array
    {
        $contado = $sesion->monto_cierre_contado !== null
            ? (string) $sesion->monto_cierre_contado
            : null;
        $billeteras = is_array($sesion->saldos_cierre_json) && $sesion->saldos_cierre_json !== []
            ? CajaBilleteras::normalize($sesion->saldos_cierre_json)
            : null;

        $arqueo ??= is_array($sesion->arqueo_json) && $sesion->arqueo_json !== []
            ? $sesion->arqueo_json
            : $this->arqueoService->build($sesion, $contado, $billeteras);

        if (! isset($arqueo['productos_total'])
            || ! isset($arqueo['servicios_total'])
            || ! isset($arqueo['metodos'])
            || ! is_array($arqueo['metodos'])
            || ! isset($arqueo['billeteras'])
            || ! is_array($arqueo['billeteras'])) {
            return $this->arqueoService->build($sesion, $contado, $billeteras);
        }

        return $arqueo;
    }

    private function resolveLogoDataUri(?RestaurantSetting $cfg): string
    {
        $binary = null;
        $mime = 'image/png';

        if ($cfg !== null) {
            $path = $cfg->logo_path;
            if (is_string($path) && $path !== '') {
                $path = ltrim($path, '/');
                if (Storage::disk('public')->exists($path)) {
                    $binary = Storage::disk('public')->get($path);
                    $detected = Storage::disk('public')->mimeType($path);
                    if (is_string($detected) && $detected !== '') {
                        $mime = $detected;
                    }
                }
            }
        }

        if ($binary === null) {
            $fallback = public_path('logo.png');
            if (! is_file($fallback)) {
                return '';
            }
            $binary = (string) file_get_contents($fallback);
            $mime = 'image/png';
        }

        if (! str_starts_with($mime, 'image/') || str_contains($mime, 'svg')) {
            return '';
        }

        // DomPDF con PNG/JPEG grandes es muy lento: reducir a ~160px JPEG.
        $resized = $this->shrinkImageForPdf((string) $binary);
        if ($resized !== null) {
            return $resized;
        }

        return 'data:'.$mime.';base64,'.base64_encode((string) $binary);
    }

    private function shrinkImageForPdf(string $binary): ?string
    {
        if (! function_exists('imagecreatefromstring') || ! function_exists('imagejpeg')) {
            return null;
        }

        $src = @imagecreatefromstring($binary);
        if ($src === false) {
            return null;
        }

        $w = imagesx($src);
        $h = imagesy($src);
        if ($w < 1 || $h < 1) {
            imagedestroy($src);

            return null;
        }

        $maxW = 160;
        if ($w <= $maxW && strlen($binary) < 40_000) {
            imagedestroy($src);

            return null;
        }

        $nw = min($maxW, $w);
        $nh = (int) max(1, round($h * ($nw / $w)));
        $dst = imagecreatetruecolor($nw, $nh);
        if ($dst === false) {
            imagedestroy($src);

            return null;
        }

        $white = imagecolorallocate($dst, 255, 255, 255);
        if ($white !== false) {
            imagefilledrectangle($dst, 0, 0, $nw, $nh, $white);
        }
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);

        ob_start();
        imagejpeg($dst, null, 82);
        $out = ob_get_clean();
        imagedestroy($src);
        imagedestroy($dst);

        if (! is_string($out) || $out === '') {
            return null;
        }

        return 'data:image/jpeg;base64,'.base64_encode($out);
    }

    /**
     * @return array{primary: string, secondary: string, on_primary: string, text: string, muted: string}
     */
    private function resolveContrastColors(string $primary): array
    {
        $onPrimary = $this->relativeLuminance($primary) > 0.55 ? '#111827' : '#FFFFFF';
        $secondary = $this->mixWithWhite($primary, 0.88);

        return [
            'primary' => $primary,
            'secondary' => $secondary,
            'on_primary' => $onPrimary,
            'text' => '#111827',
            'muted' => '#4B5563',
        ];
    }

    private function sanitizeHex(?string $value, string $fallback): string
    {
        if ($value === null || $value === '') {
            return $fallback;
        }

        $v = trim($value);
        if (preg_match('/^#[0-9A-Fa-f]{6}$/', $v) === 1) {
            return strtoupper($v);
        }

        return $fallback;
    }

    private function relativeLuminance(string $hex): float
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) !== 6) {
            return 0.0;
        }

        $channels = [
            hexdec(substr($hex, 0, 2)) / 255,
            hexdec(substr($hex, 2, 2)) / 255,
            hexdec(substr($hex, 4, 2)) / 255,
        ];

        $linear = array_map(static function (float $c): float {
            return $c <= 0.03928 ? $c / 12.92 : (($c + 0.055) / 1.055) ** 2.4;
        }, $channels);

        return 0.2126 * $linear[0] + 0.7152 * $linear[1] + 0.0722 * $linear[2];
    }

    private function mixWithWhite(string $hex, float $whiteRatio): string
    {
        $hex = ltrim($hex, '#');
        $r = (int) hexdec(substr($hex, 0, 2));
        $g = (int) hexdec(substr($hex, 2, 2));
        $b = (int) hexdec(substr($hex, 4, 2));
        $w = max(0.0, min(1.0, $whiteRatio));

        $nr = (int) round($r + (255 - $r) * $w);
        $ng = (int) round($g + (255 - $g) * $w);
        $nb = (int) round($b + (255 - $b) * $w);

        return sprintf('#%02X%02X%02X', $nr, $ng, $nb);
    }
}

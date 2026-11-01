<?php

namespace App\Services\Operacion;

use App\Models\RestaurantSetting;
use App\Models\Tenant;
use App\Models\Venta;
use App\Support\Caja\TicketAnchoMm;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/**
 * Ticket térmico de venta (HTML de impresión + PDF adjunto; estilo VetSaaS).
 */
class VentaTicketPdfService
{
    /**
     * Datos compartidos por la vista HTML de impresión y el PDF DomPDF.
     *
     * @return array<string, mixed>
     */
    public function viewData(Venta $venta, string $formato = '80', bool $shrinkLogo = true): array
    {
        $venta->loadMissing([
            'pedido.lineas',
            'pedido.mesa:id,codigo,nombre',
            'sede:id,nombre,codigo',
            'pagos',
            'createdBy:id,name',
        ]);

        $cfg = RestaurantSetting::tableReady() ? RestaurantSetting::query()->first() : null;
        /** @var Tenant|null $tenant */
        $tenant = tenant();

        $nombre = $cfg?->nombre_comercial
            ?: $cfg?->razon_social
            ?: (is_object($tenant) ? ($tenant->nombre_comercial ?? null) : null)
            ?: (is_object($tenant) ? ($tenant->razon_social ?? null) : null)
            ?: config('app.name', 'FoodSaaS');

        $igvPct = (float) ($cfg?->igv_porcentaje ?? 18);
        $incluyeIgv = (bool) ($cfg?->precio_incluye_igv ?? true);
        $total = round((float) $venta->total, 2);
        $descuento = round((float) $venta->descuento, 2);

        if ($incluyeIgv && $igvPct > 0) {
            $base = round($total / (1 + ($igvPct / 100)), 2);
            $igv = round($total - $base, 2);
            $subtotalSinIgv = $base;
        } else {
            $subtotalSinIgv = round((float) $venta->subtotal, 2);
            $igv = round($total - $subtotalSinIgv + $descuento, 2);
            if ($igv < 0) {
                $igv = 0.0;
            }
        }

        $lineas = [];
        if ($venta->pedido !== null) {
            foreach ($venta->pedido->lineas as $linea) {
                if ($linea->estado === 'anulado') {
                    continue;
                }
                $lineas[] = [
                    'nombre' => (string) $linea->nombre,
                    'cantidad' => number_format((float) $linea->cantidad, 3, '.', ''),
                    'importe' => number_format((float) $linea->importe, 2, '.', ''),
                ];
            }
        }

        $pagos = $venta->pagos->map(static fn ($p): array => [
            'medio' => (string) $p->medio,
            'monto' => number_format((float) $p->monto, 2, '.', ''),
            'referencia' => $p->referencia,
        ])->all();

        $montoRecibido = round((float) $venta->pagos->sum('monto'), 2);
        $vuelto = max(0, round($montoRecibido - $total, 2));

        $anchoFallback = $cfg !== null ? $cfg->ticket_ancho_mm : TicketAnchoMm::DEFAULT;
        $ancho = TicketAnchoMm::normalize($formato, $anchoFallback);

        return [
            'venta' => $venta,
            'lineas' => $lineas,
            'pagos' => $pagos,
            'clinic_nombre' => $nombre,
            'clinic_ruc' => $cfg?->ruc,
            'clinic_direccion' => $cfg?->direccion,
            'clinic_telefono' => $cfg?->telefono,
            'logoDataUri' => $this->resolveLogoDataUri($cfg, $shrinkLogo),
            'moneda' => (string) ($cfg?->moneda ?? 'PEN'),
            'igv_porcentaje' => $igvPct,
            'subtotal_sin_igv' => number_format($subtotalSinIgv, 2, '.', ''),
            'igv_monto' => number_format($igv, 2, '.', ''),
            'descuento' => number_format($descuento, 2, '.', ''),
            'total' => number_format($total, 2, '.', ''),
            'monto_recibido' => number_format($montoRecibido, 2, '.', ''),
            'vuelto' => number_format($vuelto, 2, '.', ''),
            'ancho_mm' => $ancho,
            'tf' => TicketAnchoMm::typography($ancho),
            'printable_mm' => TicketAnchoMm::printableMm($ancho),
            'auto_print' => false,
        ];
    }

    /**
     * @param  string  $formato  Ancho de rollo 56|57|58|80
     */
    public function render(Venta $venta, string $formato = '80'): \Barryvdh\DomPDF\PDF
    {
        $data = $this->viewData($venta, $formato, true);
        $ancho = (string) $data['ancho_mm'];
        $widthPt = ((float) TicketAnchoMm::printableMm($ancho)) * 72 / 25.4;
        $lineas = is_array($data['lineas']) ? $data['lineas'] : [];
        $pagos = is_array($data['pagos']) ? $data['pagos'] : [];
        $logoDataUri = (string) ($data['logoDataUri'] ?? '');

        $heightPt = max(
            980.0,
            620.0
            + ($logoDataUri !== '' ? 90.0 : 0.0)
            + (count($lineas) * 42.0)
            + (count($pagos) * 28.0),
        );

        $pdf = Pdf::loadView('pdf.venta-ticket', $data);
        $pdf->setPaper([0, 0, $widthPt, $heightPt], 'portrait');
        $pdf->setOption('isHtml5ParserEnabled', true);
        $pdf->setOption('isRemoteEnabled', false);
        $pdf->setOption('defaultFont', 'DejaVu Sans');
        $pdf->setOption('dpi', 96);
        $pdf->setOption('isFontSubsettingEnabled', true);

        return $pdf;
    }

    private function resolveLogoDataUri(?RestaurantSetting $cfg, bool $shrink = true): string
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

        if ($shrink) {
            $resized = $this->shrinkImageForTicket((string) $binary, $mime);
            if ($resized !== null) {
                return $resized;
            }
        }

        return 'data:'.$mime.';base64,'.base64_encode((string) $binary);
    }

    /**
     * Escala el logo a ~160px de ancho (JPEG) para acelerar DomPDF.
     */
    private function shrinkImageForTicket(string $binary, string $mime): ?string
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
}

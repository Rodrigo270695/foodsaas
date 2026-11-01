<?php

declare(strict_types=1);

namespace App\Support\Fel;

use App\Models\FelSerie;
use App\Models\Venta;

/**
 * Receptor SUNAT a partir de cliente_nombre / cliente_documento de la venta.
 */
final class FelReceptorResolver
{
    /**
     * @return array{tipo_doc: int, num_doc: string, nombre: string}
     */
    public static function desdeVenta(Venta $venta): array
    {
        $nombre = trim((string) ($venta->cliente_nombre ?? ''));
        if ($nombre === '' || strcasecmp($nombre, 'Varios') === 0) {
            $nombre = 'CLIENTES VARIOS';
        }
        $nombre = mb_substr($nombre, 0, 200);

        $digits = preg_replace('/\D+/', '', (string) ($venta->cliente_documento ?? '')) ?? '';
        $tipoDoc = strlen($digits) === 11 ? 6 : 1;
        $numDoc = match ($tipoDoc) {
            6 => strlen($digits) >= 11 ? substr($digits, 0, 11) : ($digits !== '' ? $digits : '00000000000'),
            default => strlen($digits) >= 8 ? substr($digits, 0, 8) : ($digits !== '' ? $digits : '00000000'),
        };

        return [
            'tipo_doc' => $tipoDoc,
            'num_doc' => $numDoc,
            'nombre' => $nombre,
        ];
    }

    public static function tipoSunatDesdeString(string $tipo): ?int
    {
        return match ($tipo) {
            Venta::TIPO_FACTURA => FelSerie::TIPO_FACTURA,
            Venta::TIPO_BOLETA => FelSerie::TIPO_BOLETA,
            default => null,
        };
    }
}

<?php

namespace App\Services\Operacion;

use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Autorización y normalización de descuento en cobro (permiso gerente).
 */
final class DescuentoCobro
{
    public const PERMISO = 'descuentos.apply';

    public static function normalizar(float $descuento, float $subtotal): float
    {
        $cap = max(0.0, round($subtotal, 2));

        return round(min(max(0.0, $descuento), $cap), 2);
    }

    public static function assertPuedeAplicar(?User $user, float $descuento): void
    {
        if ($descuento <= 0) {
            return;
        }

        if ($user === null || ! $user->can(self::PERMISO)) {
            throw ValidationException::withMessages([
                'descuento' => 'Solo un gerente o administrador puede aplicar descuentos.',
            ]);
        }
    }

    public static function normalizarMotivo(?string $motivo, float $descuento): ?string
    {
        if ($descuento <= 0) {
            return null;
        }

        $trimmed = trim((string) $motivo);

        return $trimmed !== '' ? mb_substr($trimmed, 0, 200) : null;
    }
}

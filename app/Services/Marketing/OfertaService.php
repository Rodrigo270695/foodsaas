<?php

declare(strict_types=1);

namespace App\Services\Marketing;

use App\Models\Oferta;
use Illuminate\Validation\ValidationException;

final class OfertaService
{
    /**
     * @return array{oferta: Oferta, descuento: float}
     */
    public function resolver(string $codigo, float $subtotal, ?string $sedeId = null): array
    {
        $codigo = strtoupper(trim($codigo));
        if ($codigo === '') {
            throw ValidationException::withMessages([
                'oferta_codigo' => 'Ingresa un código de oferta.',
            ]);
        }

        $oferta = Oferta::query()
            ->whereRaw('UPPER(codigo) = ?', [$codigo])
            ->when(
                $sedeId !== null && $sedeId !== '',
                fn ($q) => $q->where(function ($inner) use ($sedeId): void {
                    $inner->whereNull('sede_id')->orWhere('sede_id', $sedeId);
                }),
            )
            ->first();

        if ($oferta === null || ! $oferta->isVigenteHoy()) {
            throw ValidationException::withMessages([
                'oferta_codigo' => 'Código de oferta inválido o vencido.',
            ]);
        }

        $descuento = $oferta->calcularDescuento($subtotal);
        if ($descuento <= 0) {
            throw ValidationException::withMessages([
                'oferta_codigo' => 'La oferta no genera descuento en este monto.',
            ]);
        }

        return ['oferta' => $oferta, 'descuento' => $descuento];
    }

    public function registrarUso(Oferta $oferta): void
    {
        $oferta->increment('usos_count');
    }
}

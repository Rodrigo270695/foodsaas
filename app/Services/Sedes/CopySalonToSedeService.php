<?php

namespace App\Services\Sedes;

use App\Models\Mesa;
use App\Models\Zona;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class CopySalonToSedeService
{
    /**
     * Copia zonas y mesas de la sede origen a la destino.
     * No duplica códigos ya existentes en destino.
     *
     * @return array{zonas: int, mesas: int}
     */
    public function copy(string $fromSedeId, string $toSedeId): array
    {
        ActiveSedeContext::assertAccessible($fromSedeId);
        ActiveSedeContext::assertAccessible($toSedeId);

        if ($fromSedeId === $toSedeId) {
            throw ValidationException::withMessages([
                'target_sede_id' => 'Elige una sede distinta a la actual.',
            ]);
        }

        return DB::transaction(function () use ($fromSedeId, $toSedeId): array {
            $zonasCopied = 0;
            $mesasCopied = 0;
            $zonaMap = [];

            $sourceZonas = Zona::query()
                ->where('sede_id', $fromSedeId)
                ->orderBy('orden')
                ->get();

            foreach ($sourceZonas as $zona) {
                $existing = Zona::query()
                    ->where('sede_id', $toSedeId)
                    ->whereRaw('lower(nombre) = ?', [mb_strtolower($zona->nombre)])
                    ->first();

                if ($existing) {
                    $zonaMap[$zona->id] = $existing->id;
                    continue;
                }

                $new = Zona::query()->create([
                    'sede_id' => $toSedeId,
                    'nombre' => $zona->nombre,
                    'orden' => $zona->orden,
                    'activa' => $zona->activa,
                ]);
                $zonaMap[$zona->id] = $new->id;
                $zonasCopied++;
            }

            $sourceMesas = Mesa::query()
                ->where('sede_id', $fromSedeId)
                ->orderBy('codigo')
                ->get();

            foreach ($sourceMesas as $mesa) {
                $exists = Mesa::query()
                    ->where('sede_id', $toSedeId)
                    ->where('codigo', $mesa->codigo)
                    ->exists();

                if ($exists) {
                    continue;
                }

                $targetZonaId = $zonaMap[$mesa->zona_id] ?? null;
                if ($targetZonaId === null) {
                    continue;
                }

                Mesa::query()->create([
                    'sede_id' => $toSedeId,
                    'zona_id' => $targetZonaId,
                    'codigo' => $mesa->codigo,
                    'nombre' => $mesa->nombre,
                    'capacidad' => $mesa->capacidad,
                    'activa' => $mesa->activa,
                ]);
                $mesasCopied++;
            }

            return ['zonas' => $zonasCopied, 'mesas' => $mesasCopied];
        });
    }
}

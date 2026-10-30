<?php

declare(strict_types=1);

namespace App\Support\Restaurante;

/**
 * Horario semanal de atención del restaurante (JSON en cfg_restaurant_settings).
 *
 * Forma:
 *   { lun: { abierto: true, abre: "11:00", cierra: "23:00" }, ... }
 */
final class HorarioAtencion
{
    /** @var list<string> */
    public const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

    public const DEFAULT_ABRE = '11:00';

    public const DEFAULT_CIERRA = '23:00';

    /**
     * @return array<string, array{abierto: bool, abre: string, cierra: string}>
     */
    public static function normalize(mixed $raw): array
    {
        $source = is_array($raw) ? $raw : [];
        $out = [];

        foreach (self::DIAS as $dia) {
            $row = is_array($source[$dia] ?? null) ? $source[$dia] : [];
            $abre = self::normalizeHora($row['abre'] ?? null, self::DEFAULT_ABRE);
            $cierra = self::normalizeHora($row['cierra'] ?? null, self::DEFAULT_CIERRA);

            $out[$dia] = [
                'abierto' => (bool) ($row['abierto'] ?? true),
                'abre' => $abre,
                'cierra' => $cierra,
            ];
        }

        return $out;
    }

    /**
     * @return array<string, array{abierto: bool, abre: string, cierra: string}>
     */
    public static function defaults(): array
    {
        return self::normalize([]);
    }

    public static function normalizeHora(mixed $value, string $fallback): string
    {
        $candidate = is_string($value) ? trim($value) : '';

        if (preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $candidate) === 1) {
            return $candidate;
        }

        return $fallback;
    }
}

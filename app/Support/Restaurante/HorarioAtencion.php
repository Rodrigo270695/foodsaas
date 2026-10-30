<?php

declare(strict_types=1);

namespace App\Support\Restaurante;

/**
 * Horario semanal de atención de una sede (JSON en public.sedes).
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

    /**
     * @return array<string, mixed>
     */
    public static function decodeInput(mixed $raw): array
    {
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : [];
        }

        if (! is_array($raw)) {
            return [];
        }

        foreach (self::DIAS as $dia) {
            if (! isset($raw[$dia]) || ! is_array($raw[$dia])) {
                continue;
            }
            $raw[$dia]['abierto'] = filter_var(
                $raw[$dia]['abierto'] ?? false,
                FILTER_VALIDATE_BOOLEAN,
            );
            foreach (['abre', 'cierra'] as $campo) {
                $hora = $raw[$dia][$campo] ?? null;
                if (is_string($hora) && preg_match('/^\d{2}:\d{2}/', $hora) === 1) {
                    $raw[$dia][$campo] = substr($hora, 0, 5);
                }
            }
        }

        return $raw;
    }

    /**
     * @return array<string, list<string>>
     */
    public static function rules(string $prefix = 'horario_atencion'): array
    {
        $rules = [
            $prefix => ['required', 'array'],
        ];

        foreach (self::DIAS as $dia) {
            $rules["{$prefix}.{$dia}"] = ['required', 'array'];
            $rules["{$prefix}.{$dia}.abierto"] = ['required', 'boolean'];
            $rules["{$prefix}.{$dia}.abre"] = ['required', 'date_format:H:i'];
            $rules["{$prefix}.{$dia}.cierra"] = ['required', 'date_format:H:i'];
        }

        return $rules;
    }
}

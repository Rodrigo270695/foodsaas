<?php

declare(strict_types=1);

namespace App\Support\Sales;

use App\Models\Plan;

final class SalesKnowledgeExport
{
    public const PRODUCT = 'foodsaas';

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        return [
            'version' => 1,
            'producto' => self::PRODUCT,
            'nombre' => 'FoodSaaS',
            'resumen' => (string) config('salesbot.orvae.resumen'),
            'publico' => (string) config('salesbot.orvae.publico'),
            'palabras_clave' => array_values((array) config('salesbot.orvae.palabras_clave', [])),
            'planes' => $this->planes(),
            'secciones' => [],
            'demo' => $this->demo(),
            'registro_url' => (string) config('salesbot.register_url'),
            'actualizado_at' => now()->toIso8601String(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function planes(): array
    {
        return Plan::query()
            ->where('activo', true)
            ->where('es_publico', true)
            ->orderBy('orden')
            ->get()
            ->map(fn (Plan $plan): array => [
                'codigo' => $plan->codigo,
                'nombre' => $plan->nombre,
                'descripcion' => $plan->descripcion,
                'precio_mensual' => $plan->precio_mensual !== null ? (float) $plan->precio_mensual : null,
                'precio_anual' => $plan->precio_anual !== null ? (float) $plan->precio_anual : null,
                'moneda' => 'PEN',
                'trial_days' => (int) $plan->trial_days,
                'incluye' => [],
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, string>|null
     */
    private function demo(): ?array
    {
        $url = trim((string) config('salesbot.demo_url', ''));
        if ($url === '') {
            return null;
        }

        return [
            'url' => $url,
            'usuario' => (string) config('salesbot.demo_email', ''),
            'password' => (string) config('salesbot.demo_password', ''),
        ];
    }
}

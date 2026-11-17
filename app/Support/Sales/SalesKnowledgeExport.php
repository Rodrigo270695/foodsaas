<?php

declare(strict_types=1);

namespace App\Support\Sales;

use App\Models\Plan;
use App\Models\PlanFeature;

/**
 * Conocimiento comercial de FoodSaaS para el Centro de Ventas de ORVAE (contrato v1).
 */
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
            'secciones' => [
                ...$this->secciones('novedad', (array) config('salesbot.novedades', [])),
                ...$this->secciones('modulo', (array) config('salesbot.modulos', [])),
                ...$this->secciones('faq', (array) config('salesbot.faq', [])),
                ...$this->secciones('objecion', (array) config('salesbot.objeciones', [])),
            ],
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
            ->with('features')
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
                'incluye' => $this->incluye($plan),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<string>
     */
    private function incluye(Plan $plan): array
    {
        $items = ['Salón, pedidos, cocina y caja'];

        foreach ([
            'max_sedes' => ['sede', 'sedes'],
            'max_usuarios' => ['usuario', 'usuarios'],
            'max_productos' => ['producto en carta', 'productos en carta'],
            'max_mesas' => ['mesa', 'mesas'],
        ] as $feature => [$singular, $plural]) {
            $value = $this->featureValue($plan, $feature);
            $items[] = match (true) {
                ! is_int($value) || $value < 0 => "Sin límite de {$plural}",
                $value === 1 => "1 {$singular}",
                default => "{$value} {$plural}",
            };
        }

        $modulos = array_values(array_filter([
            $this->featureValue($plan, 'modulo_delivery') === true ? 'delivery' : null,
            $this->featureValue($plan, 'modulo_reservas') === true ? 'reservas' : null,
            $this->featureValue($plan, 'modulo_whatsapp') === true ? 'WhatsApp' : null,
            $this->featureValue($plan, 'modulo_recetas') === true ? 'recetas' : null,
            $this->featureValue($plan, 'modulo_compras') === true ? 'compras' : null,
            $this->featureValue($plan, 'multi_almacen') === true ? 'multi-almacén' : null,
            $this->featureValue($plan, 'franquicia_consolidado') === true ? 'consolidado de sedes' : null,
        ]));

        if ($modulos !== []) {
            $items[] = 'También incluye: '.implode(', ', $modulos);
        }

        $comprobantes = array_values(array_filter([
            $this->featureValue($plan, 'boletas_electronicas') === true ? 'boletas' : null,
            $this->featureValue($plan, 'facturas_electronicas') === true ? 'facturas' : null,
            $this->featureValue($plan, 'guias_remision') === true ? 'guías de remisión' : null,
            $this->featureValue($plan, 'notas_credito') === true ? 'notas de crédito' : null,
        ]));

        if ($comprobantes === []) {
            $items[] = 'Sin comprobantes SUNAT en este plan';

            return $items;
        }

        $max = $this->featureValue($plan, 'max_comprobantes_mes');
        $items[] = 'Facturación electrónica SUNAT: '.implode(', ', $comprobantes)
            .(is_int($max) && $max >= 0 ? " (hasta {$max} comprobantes/mes)" : ' (comprobantes ilimitados)');

        return $items;
    }

    private function featureValue(Plan $plan, string $feature): int|bool|string|null
    {
        $meta = Plan::FEATURE_CATALOG[$feature] ?? null;
        if (! is_array($meta)) {
            return null;
        }

        /** @var PlanFeature|null $row */
        $row = $plan->features->firstWhere('feature', $feature);
        if ($row === null) {
            return $meta['default'];
        }

        return match ($meta['type']) {
            'int' => $row->valor_int !== null ? (int) $row->valor_int : null,
            'bool' => (bool) $row->valor_bool,
            'str' => $row->valor_str,
            default => null,
        };
    }

    /**
     * @param  array<int, mixed>  $items
     * @return list<array<string, mixed>>
     */
    private function secciones(string $tipo, array $items): array
    {
        $out = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $titulo = trim((string) ($item['titulo'] ?? ''));
            $contenido = trim((string) ($item['contenido'] ?? ''));
            if ($titulo === '' || $contenido === '') {
                continue;
            }

            $out[] = [
                'tipo' => $tipo,
                'titulo' => $titulo,
                'contenido' => $contenido,
                'fecha' => $item['fecha'] ?? null,
            ];
        }

        return $out;
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

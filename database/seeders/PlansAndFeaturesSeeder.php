<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\PlanFeature;
use Illuminate\Database\Seeder;

class PlansAndFeaturesSeeder extends Seeder
{
    public function run(): void
    {
        PlanFeature::query()
            ->whereIn('feature', ['modulo_inventario', 'modulo_kds', 'multi_sede'])
            ->delete();

        $definitions = [
            'free' => [
                'nombre' => 'Free',
                'descripcion' => 'Para probar FoodSaaS sin compromiso',
                'badge' => null,
                'color_hex' => '#6B7280',
                'precio_mensual' => 0,
                'trial_days' => 0,
                'referral_reward_days' => 0,
                'orden' => 1,
                'features' => $this->features([
                    'max_sedes' => 1,
                    'max_usuarios' => 1,
                    'max_productos' => 50,
                    'max_mesas' => 15,
                    'max_pedidos_mes' => 200,
                ]),
            ],
            'starter' => [
                'nombre' => 'Starter',
                'descripcion' => 'Local pequeño: ventas, mesas y cocina',
                'badge' => null,
                'color_hex' => '#660033',
                'precio_mensual' => 200,
                'trial_days' => 14,
                'referral_reward_days' => 14,
                'orden' => 2,
                'features' => $this->features([
                    'max_sedes' => 1,
                    'max_usuarios' => 5,
                    'max_productos' => 200,
                    'max_mesas' => 40,
                    'max_pedidos_mes' => 1500,
                    'modulo_reportes' => true,
                    'boletas_electronicas' => true,
                    'max_comprobantes_mes' => 100,
                ]),
            ],
            'pro' => [
                'nombre' => 'Pro',
                'descripcion' => 'Delivery, reservas y facturación para restaurantes en crecimiento',
                'badge' => 'Más popular',
                'color_hex' => '#1D4ED8',
                'precio_mensual' => 490,
                'trial_days' => 14,
                'referral_reward_days' => 21,
                'orden' => 3,
                'features' => $this->features([
                    'max_sedes' => 2,
                    'max_usuarios' => 20,
                    'max_productos' => 2000,
                    'max_mesas' => 120,
                    'max_pedidos_mes' => -1,
                    'modulo_delivery' => true,
                    'modulo_reservas' => true,
                    'modulo_reportes' => true,
                    'boletas_electronicas' => true,
                    'facturas_electronicas' => true,
                    'max_comprobantes_mes' => 500,
                ]),
            ],
            'restaurante' => [
                'nombre' => 'Restaurante',
                'descripcion' => 'Multi-sede y facturación avanzada para cadenas',
                'badge' => 'Mejor valor',
                'color_hex' => '#7C3AED',
                'precio_mensual' => 650,
                'trial_days' => 7,
                'referral_reward_days' => 30,
                'orden' => 4,
                'features' => $this->features([
                    'max_sedes' => 10,
                    'max_usuarios' => -1,
                    'max_productos' => -1,
                    'max_mesas' => -1,
                    'max_pedidos_mes' => -1,
                    'modulo_delivery' => true,
                    'modulo_reservas' => true,
                    'modulo_reportes' => true,
                    'boletas_electronicas' => true,
                    'facturas_electronicas' => true,
                    'guias_remision' => true,
                    'notas_credito' => true,
                    'notas_debito' => true,
                    'max_comprobantes_mes' => -1,
                ]),
            ],
            Plan::CODIGO_MULTI_SEDE => [
                'nombre' => 'Multi-sede',
                'descripcion' => 'Cadenas y franquicias: muchas sedes, equipo amplio y facturación completa. Ajustá los cupos desde el panel.',
                'badge' => 'Cadenas',
                'color_hex' => '#0F766E',
                'precio_mensual' => 890,
                'trial_days' => 14,
                'referral_reward_days' => 30,
                'orden' => 5,
                'features' => $this->features([
                    'max_sedes' => -1,
                    'max_usuarios' => -1,
                    'max_productos' => -1,
                    'max_mesas' => -1,
                    'max_pedidos_mes' => -1,
                    'modulo_delivery' => true,
                    'modulo_reservas' => true,
                    'modulo_reportes' => true,
                    'boletas_electronicas' => true,
                    'facturas_electronicas' => true,
                    'guias_remision' => true,
                    'notas_credito' => true,
                    'notas_debito' => true,
                    'max_comprobantes_mes' => -1,
                ]),
            ],
        ];

        foreach ($definitions as $codigo => $meta) {
            $plan = Plan::query()->updateOrCreate(
                ['codigo' => $codigo],
                [
                    'nombre' => $meta['nombre'],
                    'descripcion' => $meta['descripcion'],
                    'badge' => $meta['badge'],
                    'color_hex' => $meta['color_hex'],
                    'precio_mensual' => $meta['precio_mensual'],
                    'precio_anual' => null,
                    'trial_days' => $meta['trial_days'],
                    'referral_reward_days' => $meta['referral_reward_days'],
                    'orden' => $meta['orden'],
                    'es_publico' => true,
                    'activo' => true,
                ],
            );

            $plan->features()->delete();

            foreach ($meta['features'] as $row) {
                PlanFeature::query()->create([
                    'plan_id' => $plan->id,
                    'feature' => $row['feature'],
                    'valor_int' => $row['valor_int'],
                    'valor_bool' => $row['valor_bool'],
                    'valor_str' => $row['valor_str'],
                ]);
            }
        }
    }

    /**
     * @param  array<string, int|bool>  $values
     * @return list<array{feature: string, valor_int: ?int, valor_bool: ?bool, valor_str: ?string}>
     */
    private function features(array $values): array
    {
        $rows = [];
        foreach ($values as $feature => $value) {
            if (! isset(Plan::FEATURE_CATALOG[$feature])) {
                continue;
            }
            if (is_bool($value)) {
                $rows[] = [
                    'feature' => $feature,
                    'valor_int' => null,
                    'valor_bool' => $value,
                    'valor_str' => null,
                ];
            } else {
                $rows[] = [
                    'feature' => $feature,
                    'valor_int' => (int) $value,
                    'valor_bool' => null,
                    'valor_str' => null,
                ];
            }
        }

        return $rows;
    }
}

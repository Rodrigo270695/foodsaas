<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Roles operativos del restaurante por tenant.
 *
 * Las plantillas viven en {@see ApplicationRolesSeeder::ROLES}; cada tenant
 * recibe sus propias filas (`roles.tenant_id`) al provisionarse (como
 * TenantRolesSeeder en VetSaaS). No se insertan con tenant_id null.
 */
class ApplicationRolesSeeder extends Seeder
{
    /**
     * @var array<string, array{description: string}>
     */
    public const ROLES = [
        'admin_restaurante' => [
            'description' => 'Dueño o administrador del restaurante.',
        ],
        'gerente' => [
            'description' => 'Gerente de turno.',
        ],
        'cajero' => [
            'description' => 'Caja y ventas.',
        ],
        'mesero' => [
            'description' => 'Mesas y pedidos en sala.',
        ],
        'cocina' => [
            'description' => 'Pedidos en cocina.',
        ],
    ];

    public function run(): void
    {
        // Sin inserción central: ver TenantRolesSeeder / provisionamiento.
    }
}

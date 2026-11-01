<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Support\Tenancy\ClinicAdminScope;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

class TenantRolesSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedAll();
    }

    public function seedAll(bool $forceSync = false): void
    {
        if (! Schema::hasTable('tenants')) {
            return;
        }

        $ids = DB::table('tenants')
            ->whereNull('deleted_at')
            ->pluck('id')
            ->all();

        foreach ($ids as $id) {
            if (is_string($id) || is_int($id)) {
                $this->seedForTenant((string) $id, $forceSync);
            }
        }
    }

    /** @var array<string, array{description: string, permissions: list<string>}> */
    public const ROLES = [
        'admin_restaurante' => [
            'description' => 'Dueño o administrador del restaurante.',
            'permissions' => [], // filled in seedForTenant: all except plataforma-*
        ],
        'gerente' => [
            'description' => 'Gerente de turno.',
            'permissions' => [
                'dashboard.view',
                'carta.view',
                'carta.manage-productos',
                'carta.manage-categorias',
                'carta.manage-areas',
                'carta.armar',
                'carta.export',
                'almacen.view',
                'almacen.ajustar',
                'almacen.export',
                'salon.view',
                'salon.create',
                'salon.update',
                'salon.delete',
                'pedidos.view',
                'pedidos.view-all',
                'pedidos.create',
                'pedidos.update',
                'pedidos.enviar',
                'pedidos.anular',
                'pedidos.cobrar',
                'cocina.view',
                'cocina.update',
                'caja.view',
                'caja.abrir',
                'caja.cerrar',
                'caja.egreso',
                'caja.cobrar',
                'ventas.view',
                'ventas.create',
                'ventas.export',
                'ventas.delete',
                'config-general.view',
                'config-general.update',
                'series.view',
                'series.create',
                'series.update',
                'documentos.view',
                'documentos.create',
                'notas-baja.view',
                'resumenes.view',
                'roles.view',
                'usuarios.view',
            ],
        ],
        'cajero' => [
            'description' => 'Caja y ventas.',
            'permissions' => [
                'dashboard.view',
                'carta.view',
                'almacen.view',
                'salon.view',
                'pedidos.view',
                'pedidos.view-all',
                'pedidos.create',
                'pedidos.update',
                'pedidos.enviar',
                'pedidos.cobrar',
                'caja.view',
                'caja.abrir',
                'caja.cerrar',
                'caja.egreso',
                'caja.cobrar',
                'ventas.view',
                'ventas.create',
                'ventas.export',
                'ventas.delete',
            ],
        ],
        'mesero' => [
            // Sin view-all: solo ve/edita pedidos que él abrió (opened_by).
            'description' => 'Mesas y pedidos en sala (solo los suyos).',
            'permissions' => [
                'dashboard.view',
                'carta.view',
                'salon.view',
                'pedidos.view',
                'pedidos.create',
                'pedidos.update',
                'pedidos.enviar',
            ],
        ],
        'cocina' => [
            'description' => 'Pedidos en cocina.',
            'permissions' => [
                'dashboard.view',
                'carta.view',
                'cocina.view',
                'cocina.update',
            ],
        ],
    ];

    public function seedForTenant(string $tenantId, bool $forceSync = false): void
    {
        $guard = config('auth.defaults.guard', 'web');

        if (! Schema::hasTable(config('permission.table_names.roles'))) {
            return;
        }

        $validPermissionNames = Permission::query()
            ->where('guard_name', $guard)
            ->pluck('name')
            ->all();
        $validSet = array_flip($validPermissionNames);

        $adminPermissions = array_values(array_filter(
            $validPermissionNames,
            static fn (string $name): bool => ClinicAdminScope::isTenantAssignablePermission($name),
        ));

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId($tenantId);

        try {
            foreach (self::ROLES as $name => $definition) {
                $perms = $name === 'admin_restaurante'
                    ? $adminPermissions
                    : array_values(array_filter(
                        $definition['permissions'],
                        static fn (string $perm): bool => isset($validSet[$perm]),
                    ));

                $role = Role::query()->firstOrCreate(
                    [
                        'name' => $name,
                        'guard_name' => $guard,
                        'tenant_id' => $tenantId,
                    ],
                    ['description' => $definition['description']],
                );

                if ($role->description !== $definition['description']) {
                    $role->description = $definition['description'];
                    $role->save();
                }

                if ($forceSync) {
                    $role->syncPermissions($perms);
                } else {
                    $existing = $role->permissions->pluck('name')->all();
                    $toAdd = array_values(array_diff($perms, $existing));
                    if ($toAdd !== []) {
                        $role->givePermissionTo($toAdd);
                    }
                }
            }

            app(PermissionRegistrar::class)->forgetCachedPermissions();
        } finally {
            setPermissionsTeamId($previousTeam);
        }
    }
}

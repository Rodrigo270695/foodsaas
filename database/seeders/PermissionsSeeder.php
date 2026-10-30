<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * Catálogo maestro de permisos (`<modulo>.<accion>`).
 * Por ahora solo el permiso base del panel.
 */
class PermissionsSeeder extends Seeder
{
    public const CATALOG = [
        'dashboard' => ['view'],
        // Acciones potentes (no CRUD genérico): ver, gestionar catálogo, armar carta, exportar.
        'carta' => [
            'view',
            'manage-productos',
            'manage-categorias',
            'manage-areas',
            'armar',
            'export',
        ],
        'almacen' => ['view', 'ajustar', 'export'],
        'salon' => ['view', 'create', 'update', 'delete'],
        'config-general' => ['view', 'update'],
        'series' => ['view', 'create', 'update', 'delete'],
        'sedes' => ['view', 'create', 'update', 'delete', 'export', 'bulk-delete'],
        'roles' => ['view', 'create', 'update', 'delete', 'export', 'bulk-delete'],
        'usuarios' => ['view', 'create', 'update', 'delete', 'reset-password', 'export', 'bulk-delete'],
        'plataforma-planes' => ['view', 'create', 'update', 'delete', 'export', 'bulk-delete'],
        'plataforma-tenants' => ['view', 'create', 'update', 'suspend', 'resume', 'delete', 'export', 'bulk-delete', 'impersonate'],
        'plataforma-suscripciones' => ['view', 'create', 'update', 'delete', 'export', 'bulk-delete', 'extend-trial', 'change-plan', 'cancel'],
    ];

    public function run(): void
    {
        $guard = config('auth.defaults.guard', 'web');
        $valid = self::expand();

        $existing = Permission::query()
            ->where('guard_name', $guard)
            ->pluck('id', 'name')
            ->all();

        $now = now();
        $toInsert = [];

        foreach ($valid as $name) {
            if (isset($existing[$name])) {
                continue;
            }

            $toInsert[] = [
                'name' => $name,
                'guard_name' => $guard,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if (! empty($toInsert)) {
            DB::table(config('permission.table_names.permissions'))->insert($toInsert);
        }

        Permission::query()
            ->where('guard_name', $guard)
            ->whereNotIn('name', $valid)
            ->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * @return array<int, string>
     */
    public static function expand(): array
    {
        $permissions = [];

        foreach (self::CATALOG as $module => $actions) {
            foreach ($actions as $action) {
                $permissions[] = "{$module}.{$action}";
            }
        }

        sort($permissions);

        return $permissions;
    }
}

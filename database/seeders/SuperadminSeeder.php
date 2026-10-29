<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Rol `superadmin` (tenant_id null) y usuario fijo de plataforma.
 *
 * Email: superadmin@foodsaas.pe (config/platform.php)
 * Contraseña: PLATFORM_SUPERADMIN_PASSWORD en .env
 */
class SuperadminSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('platform.superadmin.email');
        $password = config('platform.superadmin.password');

        if (! is_string($password) || $password === '') {
            $this->command?->warn(
                'SuperadminSeeder omitido: define PLATFORM_SUPERADMIN_PASSWORD en .env',
            );

            return;
        }

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId(null);

        $permissionCount = 0;

        try {
            $role = Role::query()
                ->whereNull('tenant_id')
                ->where('name', 'superadmin')
                ->where('guard_name', 'web')
                ->first();

            if ($role === null) {
                $role = Role::query()->create([
                    'name' => 'superadmin',
                    'guard_name' => 'web',
                    'tenant_id' => null,
                    'description' => 'Administrador de la plataforma SaaS.',
                ]);
            }

            $permissionIds = Permission::query()
                ->where('guard_name', 'web')
                ->pluck('id')
                ->all();

            $role->syncPermissions($permissionIds);

            $permissionCount = count($permissionIds);

            $user = User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'name' => config('platform.superadmin.name', 'Super Administrador'),
                    'password' => $password,
                    'email_verified_at' => now(),
                    'tenant_id' => null,
                ],
            );

            setPermissionsTeamId(null);
            $user->syncRoles([$role]);
        } finally {
            setPermissionsTeamId($previousTeam);
        }

        $this->command?->info(sprintf(
            'Superadmin listo: %s (rol: superadmin, %d permiso(s))',
            $email,
            $permissionCount,
        ));
    }
}

<?php

namespace App\Services\Tenancy;

use App\Models\RestaurantSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;
use Database\Seeders\TenantRolesSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Recuperación de acceso del admin_restaurante desde el panel SaaS
 * (correo inválido / olvidó contraseña y no puede usar reset).
 */
final class TenantAdminAccessRecoverer
{
    public function __construct(
        private readonly TenantManager $tenantManager,
    ) {}

    /**
     * @return array{user: User, previous_email: string, created: bool}
     */
    public function recover(
        Tenant $tenant,
        string $newEmail,
        string $password,
        bool $mustChangePassword = true,
    ): array {
        $newEmail = strtolower(trim($newEmail));

        $conflict = User::query()
            ->where('tenant_id', $tenant->id)
            ->whereRaw('LOWER(email) = ?', [$newEmail])
            ->first();

        $user = $this->resolveAdminUser($tenant);

        if ($conflict !== null && $user !== null && $conflict->id !== $user->id) {
            throw ValidationException::withMessages([
                'email' => 'Ese correo ya pertenece a otro usuario de este restaurante.',
            ]);
        }

        if ($user === null && $conflict !== null) {
            $user = $conflict;
        }

        $created = false;

        if ($user === null) {
            $user = new User;
            $created = true;
        }

        $previousEmail = $created ? '' : (string) $user->email;

        $emailTakenElsewhere = Tenant::query()
            ->whereKeyNot($tenant->id)
            ->whereRaw('LOWER(email_admin) = ?', [$newEmail])
            ->exists();

        if ($emailTakenElsewhere) {
            throw ValidationException::withMessages([
                'email' => 'Ese correo ya está registrado como admin de otro restaurante.',
            ]);
        }

        DB::transaction(function () use (
            $tenant,
            $user,
            $newEmail,
            $password,
            $mustChangePassword,
            $created,
            $previousEmail,
        ): void {
            (new TenantRolesSeeder)->seedForTenant((string) $tenant->id);

            $previousTeam = getPermissionsTeamId();
            setPermissionsTeamId((string) $tenant->id);

            try {
                $payload = [
                    'email' => $newEmail,
                    'password' => $password,
                    'is_active' => true,
                    'must_change_password' => $mustChangePassword,
                    'email_verified_at' => now(),
                ];

                if ($created || blank($user->tenant_id)) {
                    $payload['tenant_id'] = $tenant->id;
                }

                if ($created || blank($user->name)) {
                    $payload['name'] = $tenant->nombre_comercial
                        ?: $tenant->razon_social
                        ?: 'Administrador Restaurante';
                }

                $user->forceFill($payload)->save();
                $user->syncRoles(['admin_restaurante']);
            } finally {
                setPermissionsTeamId($previousTeam);
            }

            $tenant->forceFill(['email_admin' => $newEmail])->save();
            $this->tenantManager->flushCacheFor($tenant);

            $this->syncRestaurantOperationsEmail($tenant, $previousEmail, $newEmail, $user);
        });

        return [
            'user' => $user->fresh() ?? $user,
            'previous_email' => $previousEmail !== '' ? $previousEmail : $newEmail,
            'created' => $created,
        ];
    }

    private function resolveAdminUser(Tenant $tenant): ?User
    {
        $adminEmail = strtolower(trim((string) $tenant->email_admin));

        if ($adminEmail !== '') {
            $byEmail = User::query()
                ->where('tenant_id', $tenant->id)
                ->whereRaw('LOWER(email) = ?', [$adminEmail])
                ->first();

            if ($byEmail !== null) {
                return $byEmail;
            }
        }

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId((string) $tenant->id);

        try {
            return User::query()
                ->where('tenant_id', $tenant->id)
                ->role('admin_restaurante')
                ->orderBy('created_at')
                ->first();
        } finally {
            setPermissionsTeamId($previousTeam);
        }
    }

    private function syncRestaurantOperationsEmail(
        Tenant $tenant,
        string $previousEmail,
        string $newEmail,
        User $user,
    ): void {
        $schema = (string) ($tenant->schema_name ?? '');
        if ($schema === '' || ! preg_match('/^[a-z0-9_]+$/', $schema)) {
            return;
        }

        try {
            DB::connection()->statement('SET search_path TO "'.$schema.'", public');

            if (! RestaurantSetting::tableReady()) {
                return;
            }

            $setting = RestaurantSetting::current();
            $wasOperations = filled($setting->email_operaciones)
                && strcasecmp((string) $setting->email_operaciones, $previousEmail) === 0;

            if ($wasOperations || blank($setting->email_operaciones)) {
                $setting->forceFill([
                    'email_operaciones' => $newEmail,
                    'updated_by_id' => $user->id,
                ])->save();
            }
        } catch (\Throwable) {
            // Schema sin cfg o no migrado: el login ya queda corregido en public.users.
        } finally {
            DB::connection()->statement('SET search_path TO public');
        }
    }
}

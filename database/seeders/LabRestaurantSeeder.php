<?php

namespace Database\Seeders;

use App\Models\Distrito;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Tenancy\TenantDefaultSedeProvisioner;
use App\Services\Tenancy\TenantProvisioner;
use App\Support\Sedes\SedeAssignment;
use App\Support\Subscriptions\SubscriptionCiclo;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Tenant privado de pruebas (no es la demo pública).
 *
 *   php artisan db:seed --class=PlansAndFeaturesSeeder
 *   php artisan db:seed --class=LabRestaurantSeeder
 */
class LabRestaurantSeeder extends Seeder
{
    public const SLUG = 'pruebas';

    public const ADMIN_EMAIL = 'admin@foodsaas.pe';

    public const ADMIN_PASSWORD = 'Rodrigo270695';

    public function run(): void
    {
        $plan = Plan::query()
            ->where('codigo', Plan::CODIGO_MULTI_SEDE)
            ->where('activo', true)
            ->first();

        if ($plan === null) {
            $this->command?->error('LabRestaurantSeeder: falta el plan multi_sede. Ejecuta PlansAndFeaturesSeeder.');

            return;
        }

        $distrito = Distrito::query()
            ->with('provincia.departamento')
            ->whereRaw('LOWER(name) in (?, ?, ?)', ['miraflores', 'san isidro', 'lima'])
            ->orderBy('id')
            ->first()
            ?? Distrito::query()->with('provincia.departamento')->orderBy('id')->first();

        $payload = [
            'schema_name' => TenantProvisioner::schemaNameFromSlug(self::SLUG),
            'razon_social' => 'Sabores del Pacífico S.A.C.',
            'nombre_comercial' => 'Pruebas FoodSaaS',
            'ruc' => '20601234871',
            'email_admin' => self::ADMIN_EMAIL,
            'telefono' => '987654321',
            'direccion' => 'Av. La Marina 2855, San Miguel',
            'distrito_id' => $distrito?->id,
            'estado' => 'active',
            'trial_ends_at' => null,
            'onboarding_completado' => true,
            'onboarding_paso' => 0,
            'timezone' => 'America/Lima',
            'locale' => 'es_PE',
            'canal_adquisicion' => 'manual',
        ];

        $emailTaken = Tenant::query()
            ->where('email_admin', self::ADMIN_EMAIL)
            ->where('slug', '!=', self::SLUG)
            ->exists();

        if ($emailTaken) {
            $this->command?->error('LabRestaurantSeeder: el correo ya pertenece a otro tenant.');

            return;
        }

        $existingUser = User::query()
            ->whereRaw('LOWER(email) = ?', [self::ADMIN_EMAIL])
            ->first();
        $existingTenantId = Tenant::query()->where('slug', self::SLUG)->value('id');

        if ($existingUser !== null) {
            $belongsHere = $existingTenantId !== null
                && (string) $existingUser->tenant_id === (string) $existingTenantId;

            if (! $belongsHere) {
                $this->command?->error('LabRestaurantSeeder: el correo ya está en users de otra cuenta.');

                return;
            }
        }

        $tenant = Tenant::query()->firstOrCreate(
            ['slug' => self::SLUG],
            $payload,
        );

        $tenant->forceFill(collect($payload)->except('schema_name')->all())->save();

        $subscription = $tenant->subscriptions()
            ->whereIn('estado', ['trial', 'active', 'grace'])
            ->latest()
            ->first();

        if ($subscription === null) {
            $subscription = app(TenantProvisioner::class)->createInitialSubscription(
                $tenant,
                $plan,
                SubscriptionCiclo::MENSUAL,
            );
        }

        $subscription->forceFill([
            'plan_id' => $plan->id,
            'estado' => 'active',
            'trial_ends_at' => null,
        ])->save();

        try {
            app(TenantProvisioner::class)->ensurePhysicalSchema($tenant);
        } catch (\Throwable $e) {
            $this->command?->warn('Schema pruebas: '.$e->getMessage());
        }

        app(TenantDefaultSedeProvisioner::class)->ensureDefaultSede($tenant->fresh());

        $user = User::query()->updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'email' => self::ADMIN_EMAIL,
            ],
            [
                'name' => 'Rodrigo Admin',
                'password' => Hash::make(self::ADMIN_PASSWORD),
                'phone' => '987654321',
                'is_active' => true,
                'must_change_password' => false,
            ],
        );
        $user->forceFill(['email_verified_at' => now()])->save();

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId((string) $tenant->id);
        try {
            if ($user->roles()->where('name', 'admin_restaurante')->doesntExist()) {
                $user->assignRole('admin_restaurante');
            }
        } finally {
            setPermissionsTeamId($previousTeam);
        }

        SedeAssignment::syncForUser($user->fresh(), null);

        $loginHost = self::SLUG.'.'.config('tenant.root_domain', 'foodsaas.test');
        $this->command?->info('Tenant de pruebas listo: '.$loginHost.' → '.self::ADMIN_EMAIL);
    }
}

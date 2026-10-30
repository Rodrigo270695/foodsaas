<?php

namespace Database\Seeders;

use App\Models\Distrito;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Tenancy\TenantDefaultSedeProvisioner;
use App\Services\Tenancy\TenantProvisioner;
use App\Support\Subscriptions\SubscriptionCiclo;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Restaurante demo público: slug `demo`, login demo@foodsaas.pe / demo1234.
 *
 * Ejecutar en servidor tras migrate + Rbac + planes:
 *   php artisan db:seed --class=DemoRestaurantSeeder
 */
class DemoRestaurantSeeder extends Seeder
{
    public const SLUG = 'demo';

    public const ADMIN_EMAIL = 'demo@foodsaas.pe';

    public const ADMIN_PASSWORD = 'demo1234';

    public function run(): void
    {
        $plan = Plan::query()->where('codigo', 'starter')->where('activo', true)->first()
            ?? Plan::query()->where('activo', true)->orderBy('orden')->first();

        if ($plan === null) {
            $this->command?->error('DemoRestaurantSeeder: no hay planes activos. Ejecuta PlansAndFeaturesSeeder.');

            return;
        }

        $distritoId = Distrito::query()->value('id');

        $tenant = Tenant::query()->firstOrCreate(
            ['slug' => self::SLUG],
            [
                'schema_name' => TenantProvisioner::schemaNameFromSlug(self::SLUG),
                'razon_social' => 'Restaurante demo FoodSaaS',
                'nombre_comercial' => 'Demo FoodSaaS',
                'email_admin' => self::ADMIN_EMAIL,
                'telefono' => null,
                'distrito_id' => $distritoId,
                'estado' => 'active',
                'trial_ends_at' => null,
                'onboarding_completado' => true,
                'onboarding_paso' => 0,
                'timezone' => 'America/Lima',
                'locale' => 'es_PE',
                'canal_adquisicion' => 'demo',
            ],
        );

        if ($tenant->email_admin !== self::ADMIN_EMAIL) {
            $tenant->forceFill(['email_admin' => self::ADMIN_EMAIL])->save();
        }

        if ($tenant->subscriptions()->whereIn('estado', ['trial', 'active', 'grace'])->doesntExist()) {
            app(TenantProvisioner::class)->createInitialSubscription(
                $tenant,
                $plan,
                SubscriptionCiclo::MENSUAL,
            );
            $tenant->subscriptions()->latest()->first()?->update(['estado' => 'active']);
        }

        try {
            app(TenantProvisioner::class)->ensurePhysicalSchema($tenant);
        } catch (\Throwable $e) {
            $this->command?->warn('Schema demo: '.$e->getMessage());
        }

        app(TenantDefaultSedeProvisioner::class)->ensureDefaultSede($tenant->fresh());

        $user = User::query()->updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'email' => self::ADMIN_EMAIL,
            ],
            [
                'name' => 'Administrador Demo',
                'password' => Hash::make(self::ADMIN_PASSWORD),
                'is_active' => true,
                'must_change_password' => false,
                'email_verified_at' => now(),
            ],
        );

        $previousTeam = getPermissionsTeamId();
        setPermissionsTeamId((string) $tenant->id);
        try {
            if ($user->roles()->where('name', 'admin_restaurante')->doesntExist()) {
                $user->assignRole('admin_restaurante');
            }
        } finally {
            setPermissionsTeamId($previousTeam);
        }

        $this->command?->info('Demo listo: '.self::SLUG.' → '.self::ADMIN_EMAIL.' / '.self::ADMIN_PASSWORD);
    }
}

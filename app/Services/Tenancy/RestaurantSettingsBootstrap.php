<?php

namespace App\Services\Tenancy;

use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RestaurantSettingsBootstrap
{
    public function __construct(private TenantManager $manager) {}

    public function ensureDefaultRow(Tenant $tenant): void
    {
        $this->manager->runForTenant($tenant, function () use ($tenant): void {
            if (DB::table('cfg_restaurant_settings')->exists()) {
                return;
            }

            DB::table('cfg_restaurant_settings')->insert([
                'id' => (string) Str::uuid(),
                'ruc' => $tenant->ruc,
                'razon_social' => $tenant->razon_social,
                'nombre_comercial' => $tenant->nombre_comercial,
                'direccion' => $tenant->direccion,
                'distrito_id' => $tenant->distrito_id,
                'email_operaciones' => $tenant->email_admin,
                'telefono' => $tenant->telefono,
                'timezone' => $tenant->timezone ?? 'America/Lima',
                'locale' => $tenant->locale ?? 'es_PE',
                'moneda' => 'PEN',
                'igv_porcentaje' => 18,
                'precio_incluye_igv' => true,
                'color_primario' => '#660033',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }, enforceAccess: false);
    }
}

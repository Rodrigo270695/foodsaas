<?php

use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Los roles operativos del restaurante no deben vivir con tenant_id null
 * (solo plataforma: superadmin + roles personalizados centrales).
 */
return new class extends Migration
{
    public function up(): void
    {
        $teamKey = config('permission.column_names.team_foreign_key', 'tenant_id');

        DB::table(config('permission.table_names.roles', 'roles'))
            ->whereNull($teamKey)
            ->whereIn('name', Role::BASE_RESTAURANT_ROLES)
            ->delete();
    }

    public function down(): void
    {
        // No reinsertar plantillas aquí; usar provisionamiento por tenant.
    }
};

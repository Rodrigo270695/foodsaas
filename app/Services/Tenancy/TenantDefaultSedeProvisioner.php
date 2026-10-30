<?php

declare(strict_types=1);

namespace App\Services\Tenancy;

use App\Models\Distrito;
use App\Models\Sede;
use App\Models\Tenant;
use App\Support\Plan\PlanLimits;
use Illuminate\Support\Facades\Schema;

/**
 * Crea la sede principal al provisionar un tenant (datos del alta).
 */
final class TenantDefaultSedeProvisioner
{
    public function ensureDefaultSede(Tenant $tenant, ?int $createdByUserId = null): ?Sede
    {
        if (! Schema::hasTable('sedes')) {
            return null;
        }

        $tenantId = (string) $tenant->id;

        $hasActive = Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->exists();

        if ($hasActive) {
            return null;
        }

        if (PlanLimits::wouldExceed('max_sedes', $tenant, null, 1)) {
            return null;
        }

        $tenant->loadMissing('distritoModel.provincia.departamento');

        $distrito = $tenant->distritoModel;
        if ($distrito === null && $tenant->distrito_id !== null) {
            $distrito = Distrito::query()
                ->with('provincia.departamento')
                ->find($tenant->distrito_id);
        }
        if ($distrito === null) {
            $distrito = Distrito::query()
                ->with('provincia.departamento')
                ->orderBy('id')
                ->first();
        }

        $nombre = trim((string) ($tenant->nombre_comercial ?: $tenant->razon_social ?: 'Sede principal'));
        $nombre = mb_substr($nombre, 0, 150);

        return Sede::query()->create([
            'tenant_id' => $tenantId,
            'codigo' => Sede::generateNextCode($tenantId),
            'nombre' => $nombre,
            'direccion' => $tenant->direccion,
            'telefono' => $tenant->telefono,
            'email' => $tenant->email_admin,
            'distrito_id' => $distrito?->id,
            'distrito' => $distrito?->name,
            'provincia' => $distrito?->provincia?->name,
            'departamento' => $distrito?->provincia?->departamento?->name,
            'activa' => true,
            'created_by_id' => $createdByUserId,
        ]);
    }
}

<?php

declare(strict_types=1);

use App\Models\Tenant;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantManager;

function tenant_id(): int|string|null
{
    $context = app(TenantManager::class)->current();

    return $context?->id();
}

if (! function_exists('is_public_demo_tenant')) {
    function is_public_demo_tenant(): bool
    {
        $slug = (string) config('demo.slug', 'demo');

        return tenant()?->slug === $slug;
    }
}

if (! function_exists('demo_config_locked')) {
    /**
     * Configuración (General, Sedes, Roles, Usuarios) sigue bloqueada en el
     * tenant público `demo`. El resto del sistema sí admite crear/editar/borrar.
     */
    function demo_config_locked(): bool
    {
        return is_public_demo_tenant();
    }
}

if (! function_exists('demo_mutations_locked')) {
    /**
     * Bloqueo global de mutaciones. La demo pública ya no es de solo lectura:
     * se puede operar (series, caja, etc.). Configuración se bloquea con
     * {@see demo_config_locked()}.
     */
    function demo_mutations_locked(): bool
    {
        return false;
    }
}

if (! function_exists('current_tenant')) {
    function current_tenant(): ?Tenant
    {
        return app(TenantManager::class)->current()?->tenant;
    }
}

if (! function_exists('tenant')) {
    function tenant(): ?TenantContext
    {
        return app(TenantManager::class)->current();
    }
}

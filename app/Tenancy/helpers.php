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

if (! function_exists('demo_mutations_locked')) {
    /**
     * True en el tenant público `demo`, también en modo soporte.
     * Así nadie (ni un inquieto ni impersonación) borra datos de la demo.
     */
    function demo_mutations_locked(): bool
    {
        return is_public_demo_tenant();
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

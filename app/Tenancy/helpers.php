<?php

declare(strict_types=1);

use App\Tenancy\TenantManager;

function tenant_id(): int|string|null
{
    $context = app(TenantManager::class)->current();

    return $context?->id();
}

if (! function_exists('is_public_demo_tenant')) {
    function is_public_demo_tenant(): bool
    {
        return tenant()?->slug === 'demo';
    }
}

if (! function_exists('current_tenant')) {
    function current_tenant(): ?\App\Models\Tenant
    {
        return app(TenantManager::class)->current()?->tenant;
    }
}

if (! function_exists('tenant')) {
    function tenant(): ?\App\Tenancy\TenantContext
    {
        return app(TenantManager::class)->current();
    }
}

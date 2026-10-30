<?php

declare(strict_types=1);

use App\Models\Tenant;
use App\Models\User;
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
     * True cuando el request está en el tenant demo y no es superadmin de plataforma.
     */
    function demo_mutations_locked(): bool
    {
        if (! is_public_demo_tenant()) {
            return false;
        }

        $user = auth()->user();

        if ($user instanceof User && $user->isPlatformSuperadmin()) {
            return false;
        }

        return true;
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

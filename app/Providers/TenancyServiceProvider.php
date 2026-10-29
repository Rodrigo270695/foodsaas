<?php

namespace App\Providers;

use App\Tenancy\TenantManager;
use Illuminate\Support\ServiceProvider;

class TenancyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TenantManager::class);
        $this->app->alias(TenantManager::class, 'tenant.manager');
        $this->app->singleton(\App\Tenancy\Resolvers\SubdomainResolver::class);
    }
}

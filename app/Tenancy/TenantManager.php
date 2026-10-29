<?php

namespace App\Tenancy;

use App\Models\Tenant;
use App\Services\Subscriptions\TenantSubscriptionAccess;
use App\Tenancy\Exceptions\TenantNotFoundException;
use App\Tenancy\Exceptions\TenantSuspendedException;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class TenantManager
{
    protected ?TenantContext $current = null;

    public function current(): ?TenantContext
    {
        return $this->current;
    }

    public function check(): bool
    {
        return $this->current !== null;
    }

    public function id(): ?string
    {
        return $this->current?->id();
    }

    public function schema(): ?string
    {
        return $this->current?->schema;
    }

    public function slug(): ?string
    {
        return $this->current?->slug;
    }

    /**
     * @throws TenantNotFoundException
     * @throws TenantSuspendedException
     */
    public function resolveBySlug(string $slug, ?ConnectionInterface $connection = null): TenantContext
    {
        $tenant = $this->findBySlug($slug);

        if (! $tenant) {
            throw new TenantNotFoundException($slug);
        }

        return $this->bootstrap($tenant, $connection);
    }

    /**
     * @throws TenantNotFoundException
     * @throws TenantSuspendedException
     */
    protected function bootstrap(Tenant $tenant, ?ConnectionInterface $connection = null): TenantContext
    {
        $access = app(TenantSubscriptionAccess::class);
        $denial = $access->resolveDenial($tenant);

        if ($denial !== null) {
            throw new TenantSuspendedException($tenant, $denial);
        }

        $schema = $this->safeSchemaName($tenant);

        if ($schema === null) {
            throw new TenantNotFoundException((string) ($tenant->slug ?? $tenant->getKey()));
        }

        $this->applySearchPath($schema, $connection);

        $this->current = new TenantContext(
            tenant: $tenant,
            schema: $schema,
            slug: (string) ($tenant->slug ?? ''),
        );

        return $this->current;
    }

    public function forget(?ConnectionInterface $connection = null): void
    {
        $conn = $connection ?? DB::connection();

        if ($conn->getDriverName() === 'pgsql') {
            $conn->statement('SET search_path TO public');
        }

        $this->current = null;
    }

    /**
     * @template T
     *
     * @param  callable(TenantContext): T  $callback
     * @return T
     */
    public function runForTenant(Tenant $tenant, callable $callback, bool $enforceAccess = true): mixed
    {
        $previous = $this->current;

        if ($enforceAccess) {
            $context = $this->bootstrap($tenant);
        } else {
            $schema = $this->safeSchemaName($tenant);

            if ($schema === null) {
                throw new TenantNotFoundException((string) ($tenant->slug ?? $tenant->getKey()));
            }

            $this->applySearchPath($schema);
            $context = $this->current = new TenantContext(
                tenant: $tenant,
                schema: $schema,
                slug: (string) ($tenant->slug ?? ''),
            );
        }

        try {
            return $callback($context);
        } finally {
            if ($previous !== null) {
                $this->applySearchPath($previous->schema);
                $this->current = $previous;
            } else {
                $this->forget();
            }
        }
    }

    public function flushCacheFor(Tenant $tenant): void
    {
        if (is_string($tenant->slug) && $tenant->slug !== '') {
            Cache::forget($this->slugCacheKey($tenant->slug));
        }

        Cache::forget($this->idCacheKey((string) $tenant->getKey()));
    }

    protected function safeSchemaName(Tenant $tenant): ?string
    {
        $raw = (string) ($tenant->schema_name ?? '');

        if ($raw === '') {
            return null;
        }

        $clean = strtolower(preg_replace('/[^a-z0-9_]/', '', $raw) ?? '');

        if ($clean === '' || strlen($clean) > 63) {
            return null;
        }

        if (! preg_match('/^[a-z_][a-z0-9_]*$/', $clean)) {
            return null;
        }

        $prefix = (string) config('tenant.schema_prefix', 'rest_');
        if ($prefix !== '' && ! str_starts_with($clean, $prefix)) {
            return null;
        }

        return $clean;
    }

    protected function applySearchPath(string $schema, ?ConnectionInterface $connection = null): void
    {
        $conn = $connection ?? DB::connection();

        if ($conn->getDriverName() !== 'pgsql') {
            return;
        }

        $conn->statement('SET search_path TO "'.$schema.'", public');
    }

    protected function findBySlug(string $slug): ?Tenant
    {
        $ttl = (int) config('tenant.cache_ttl', 60);
        $cacheKey = $this->slugCacheKey($slug);

        if ($ttl <= 0) {
            return Tenant::query()->where('slug', $slug)->first();
        }

        $tenantId = Cache::remember($cacheKey, $ttl, function () use ($slug): string {
            $id = Tenant::query()->where('slug', $slug)->value('id');

            return $id !== null ? (string) $id : '';
        });

        if ($tenantId === '') {
            return null;
        }

        return Tenant::query()->whereKey($tenantId)->first();
    }

    protected function slugCacheKey(string $slug): string
    {
        return "tenant:slug:{$slug}";
    }

    protected function idCacheKey(string $id): string
    {
        return "tenant:id:{$id}";
    }
}

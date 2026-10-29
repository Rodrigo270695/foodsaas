<?php

namespace App\Http\Middleware;

use App\Tenancy\Resolvers\SubdomainResolver;
use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    public function __construct(
        protected SubdomainResolver $resolver,
        protected TenantManager $manager,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->manager->forget();

        $slug = $this->resolver->resolveFromRequest($request);

        if ($slug === null) {
            return $next($request);
        }

        $this->manager->resolveBySlug($slug);

        URL::defaults(['tenant_subdomain' => $slug]);
        $request->route()?->forgetParameter('tenant_subdomain');

        return $next($request);
    }
}

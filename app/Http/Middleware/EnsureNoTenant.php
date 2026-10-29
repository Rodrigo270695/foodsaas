<?php

namespace App\Http\Middleware;

use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureNoTenant
{
    public function __construct(protected TenantManager $manager) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->manager->check()) {
            abort(404);
        }

        return $next($request);
    }
}

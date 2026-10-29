<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenant
{
    public function __construct(protected TenantManager $manager) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->manager->check()) {
            return $next($request);
        }

        /** @var User|null $user */
        $user = Auth::user();

        if ($user !== null && $user->isPlatformSuperadmin()) {
            return Inertia::render('shared/tenant-required', [
                'attempted_path' => '/'.ltrim($request->path(), '/'),
            ])->toResponse($request);
        }

        abort(404);
    }
}

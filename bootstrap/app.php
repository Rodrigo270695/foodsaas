<?php

use App\Http\Controllers\GeoController;
use App\Http\Middleware\EnsureNoTenant;
use App\Http\Middleware\EnsureTenant;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\MatchUserTenant;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\SetPermissionsTeam;
use App\Tenancy\Exceptions\TenantNotFoundException;
use App\Tenancy\Exceptions\TenantSuspendedException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Spatie\Permission\Exceptions\PermissionDoesNotExist;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            Route::middleware('web')
                ->domain('{tenant_subdomain}.'.config('tenant.root_domain'))
                ->group(base_path('routes/tenant.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'tenant' => ResolveTenant::class,
            'tenant.required' => EnsureTenant::class,
            'tenant.none' => EnsureNoTenant::class,
            'tenant.match-user' => MatchUserTenant::class,
        ]);

        $middleware->web(prepend: [
            ResolveTenant::class,
            SetPermissionsTeam::class,
        ]);

        $authInterface = AuthenticatesRequests::class;
        $middleware->prependToPriorityList(before: $authInterface, prepend: ResolveTenant::class);
        $middleware->prependToPriorityList(before: $authInterface, prepend: EnsureNoTenant::class);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->renderable(function (TenantNotFoundException $e, Request $request) {
            if ($request->header('X-Inertia') || ! $request->expectsJson()) {
                return Inertia::render('tenant/errors/not-found', [
                    'slug' => $e->identifier,
                ])->toResponse($request)->setStatusCode(404);
            }

            return null;
        });

        $exceptions->renderable(function (TenantSuspendedException $e, Request $request) {
            if ($request->header('X-Inertia') || ! $request->expectsJson()) {
                $tenant = $e->tenant;

                return Inertia::render('tenant/errors/blocked', [
                    'block_type' => $e->blockType,
                    'estado' => $tenant->estado,
                    'razon_social' => $tenant->razon_social,
                    'reason' => $tenant->suspension_reason ?? $tenant->cancel_reason,
                    'suspended_at' => $tenant->suspended_at?->toIso8601String(),
                    'cancelled_at' => $tenant->cancelled_at?->toIso8601String(),
                ])->toResponse($request)->setStatusCode(403);
            }

            return null;
        });

        $exceptions->renderable(function (AuthorizationException $e, Request $request) {
            if ($request->header('X-Inertia')) {
                return Inertia::render('errors/forbidden', [
                    'message' => $e->getMessage() !== '' ? $e->getMessage() : null,
                ])->toResponse($request)->setStatusCode(403);
            }

            return null;
        });

        $exceptions->renderable(function (PermissionDoesNotExist $e, Request $request) {
            report($e);

            if ($request->header('X-Inertia')) {
                return Inertia::render('errors/forbidden', [
                    'message' => 'Falta sincronizar permisos. Ejecuta: php artisan db:seed --class=PermissionsSeeder',
                ])->toResponse($request)->setStatusCode(403);
            }

            return null;
        });
    })->create();

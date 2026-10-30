<?php

use App\Http\Middleware\BlockPublicDemoMutations;
use App\Http\Middleware\EnsureNoTenant;
use App\Http\Middleware\EnsureTenant;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\MatchUserTenant;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\SetPermissionsTeam;
use App\Models\User;
use App\Tenancy\Exceptions\TenantNotFoundException;
use App\Tenancy\Exceptions\TenantSuspendedException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Permission\Exceptions\PermissionDoesNotExist;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

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
            BlockPublicDemoMutations::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || ($request->expectsJson() && ! $request->header('X-Inertia')),
        );

        $userFacingHttpMessage = static function (?string $message): ?string {
            if ($message === null || $message === '') {
                return null;
            }

            if (in_array($message, ['Not Found', 'Forbidden', 'Unauthorized.', 'Unauthorized'], true)) {
                return null;
            }

            if (str_starts_with($message, 'The route ')
                || str_starts_with($message, 'No query results for model')) {
                return null;
            }

            return $message;
        };

        $supportFacingErrorMessage = static function (Throwable $e) use ($userFacingHttpMessage): ?string {
            $user = Auth::guard('web')->user();
            $isSupport = $user instanceof User && $user->isPlatformSuperadmin();

            if (! $isSupport && ! app()->hasDebugModeEnabled()) {
                return null;
            }

            $detail = $e::class.': '.$e->getMessage();

            return $userFacingHttpMessage($detail) ?? $detail;
        };

        $renderInertiaHttpError = static function (
            Request $request,
            int $status,
            string $page,
            ?string $message = null,
        ) use ($userFacingHttpMessage) {
            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return null;
            }

            return Inertia::render($page, array_filter([
                'message' => $userFacingHttpMessage($message),
                'attempted_path' => '/'.ltrim($request->path(), '/'),
                'is_authenticated' => Auth::guard('web')->check(),
                'status' => $page === 'errors/server-error' ? $status : null,
            ], fn ($value) => $value !== null))
                ->toResponse($request)
                ->setStatusCode($status);
        };

        $exceptions->renderable(function (NotFoundHttpException $e, Request $request) use ($renderInertiaHttpError) {
            return $renderInertiaHttpError(
                $request,
                404,
                'errors/not-found',
                $e->getMessage() !== '' ? $e->getMessage() : null,
            );
        });

        $exceptions->renderable(function (ModelNotFoundException $e, Request $request) use ($renderInertiaHttpError) {
            return $renderInertiaHttpError($request, 404, 'errors/not-found', null);
        });

        $exceptions->renderable(function (AuthorizationException $e, Request $request) use ($renderInertiaHttpError) {
            return $renderInertiaHttpError(
                $request,
                403,
                'errors/forbidden',
                $e->getMessage() !== '' ? $e->getMessage() : null,
            );
        });

        $exceptions->renderable(function (PermissionDoesNotExist $e, Request $request) use ($renderInertiaHttpError) {
            report($e);

            return $renderInertiaHttpError(
                $request,
                403,
                'errors/forbidden',
                'Falta sincronizar permisos. Ejecuta: php artisan db:seed --class=PermissionsSeeder',
            );
        });

        $exceptions->renderable(function (HttpException $e, Request $request) use ($renderInertiaHttpError, $supportFacingErrorMessage) {
            $status = $e->getStatusCode();

            if ($status === 403) {
                return $renderInertiaHttpError(
                    $request,
                    403,
                    'errors/forbidden',
                    $e->getMessage() !== '' ? $e->getMessage() : null,
                );
            }

            if ($status === 404) {
                return $renderInertiaHttpError(
                    $request,
                    404,
                    'errors/not-found',
                    $e->getMessage() !== '' ? $e->getMessage() : null,
                );
            }

            if ($status === 405) {
                return $renderInertiaHttpError(
                    $request,
                    405,
                    'errors/method-not-allowed',
                    $e->getMessage() !== '' ? $e->getMessage() : null,
                );
            }

            if ($status === 503) {
                return $renderInertiaHttpError(
                    $request,
                    503,
                    'errors/server-error',
                    $e->getMessage() !== '' ? $e->getMessage() : null,
                );
            }

            if ($status === 500) {
                report($e);

                return $renderInertiaHttpError(
                    $request,
                    500,
                    'errors/server-error',
                    $supportFacingErrorMessage($e),
                );
            }

            return null;
        });

        $exceptions->renderable(function (Throwable $e, Request $request) use ($renderInertiaHttpError, $supportFacingErrorMessage) {
            if ($e instanceof TenantNotFoundException || $e instanceof TenantSuspendedException) {
                return null;
            }

            if (app()->hasDebugModeEnabled()) {
                return null;
            }

            if ($e instanceof HttpException) {
                return null;
            }

            if ($e instanceof ValidationException) {
                return null;
            }

            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return null;
            }

            report($e);

            return $renderInertiaHttpError(
                $request,
                500,
                'errors/server-error',
                $supportFacingErrorMessage($e),
            );
        });

        $exceptions->renderable(function (TenantNotFoundException $e, Request $request) {
            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return null;
            }

            return Inertia::render('tenant/errors/not-found', [
                'slug' => $e->identifier,
            ])
                ->toResponse($request)
                ->setStatusCode(404);
        });

        $exceptions->renderable(function (TenantSuspendedException $e, Request $request) {
            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return null;
            }

            if (Auth::guard('web')->check()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            $tenant = $e->tenant;
            $blockType = in_array($e->blockType, ['suspended', 'cancelled', 'expired'], true)
                ? $e->blockType
                : 'suspended';

            return Inertia::render('tenant/errors/blocked', [
                'block_type' => $blockType,
                'estado' => $tenant->estado,
                'razon_social' => $tenant->razon_social,
                'reason' => $tenant->suspension_reason ?? $tenant->cancel_reason,
                'suspended_at' => $tenant->suspended_at?->toIso8601String(),
                'cancelled_at' => $tenant->cancelled_at?->toIso8601String(),
            ])
                ->toResponse($request)
                ->setStatusCode(403);
        });
    })->create();

<?php

namespace App\Http\Middleware;

use App\Models\RestaurantSetting;
use App\Models\User;
use App\Support\Plan\PlanLimits;
use App\Support\Restaurante\RestaurantBrandingUrls;
use App\Support\Sedes\ActiveSedeContext;
use App\Support\Tenancy\TenantSubdomainUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Middleware;
use Throwable;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        try {
            return $this->buildSharedProps($request);
        } catch (Throwable $e) {
            report($e);

            return [
                ...parent::share($request),
                'name' => config('app.name'),
                'locale' => $request->getLocale(),
                'timezone' => config('app.timezone'),
                'auth' => [
                    'user' => Auth::guard('web')->user(),
                    'permissions' => [],
                    'roles' => [],
                ],
                'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSharedProps(Request $request): array
    {
        /** @var User|null $user */
        $user = Auth::guard('web')->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'locale' => $request->getLocale(),
            'timezone' => config('app.timezone'),
            'auth' => [
                'user' => $user,
                'permissions' => $this->resolveUserPermissions($user),
                'roles' => $this->resolveUserRoles($user),
            ],
            'flash' => function () use ($request) {
                $session = $request->session();
                $payload = [
                    'success' => $session->get('success'),
                    'error' => $session->get('error'),
                    'info' => $session->get('info'),
                    'warning' => $session->get('warning'),
                    'copy_url' => $session->get('copy_url'),
                    'copy_label' => $session->get('copy_label'),
                    'created_area_id' => $session->get('created_area_id'),
                ];

                $hasMessage = collect($payload)
                    ->filter(fn ($v) => (is_string($v) && $v !== '') || (is_scalar($v) && $v !== null && $v !== ''))
                    ->isNotEmpty();

                if (! $hasMessage) {
                    return null;
                }

                return [
                    'id' => sha1(serialize($payload).microtime(true)),
                    ...$payload,
                ];
            },
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'tenancy' => [
                'root_domain' => TenantSubdomainUrl::rootDomain(),
                'scheme' => TenantSubdomainUrl::scheme(),
                'login_path' => TenantSubdomainUrl::loginPath(),
            ],
            'demo_mutations_locked' => demo_mutations_locked(),
            'tenant_impersonation' => static function () use ($request) {
                $raw = $request->session()->get('tenant_impersonation');

                if (! is_array($raw) || empty($raw['tenant_id'])) {
                    return null;
                }

                return [
                    'tenant_label' => is_string($raw['tenant_label'] ?? null)
                        ? $raw['tenant_label']
                        : '',
                    'started_at' => is_string($raw['started_at'] ?? null)
                        ? $raw['started_at']
                        : null,
                ];
            },
            'tenant' => function () {
                $ctx = tenant();

                if ($ctx === null) {
                    return null;
                }

                return [
                    'id' => $ctx->id(),
                    'slug' => $ctx->slug,
                    'schema' => $ctx->schema,
                    'razon_social' => $ctx->razonSocial(),
                    'nombre_comercial' => $ctx->nombreComercial(),
                    'estado' => $ctx->estado(),
                    'is_demo' => is_public_demo_tenant(),
                ];
            },
            'clinic_branding' => function () {
                if (tenant() === null) {
                    return null;
                }

                try {
                    if (! RestaurantSetting::tableReady()) {
                        return [
                            'logo_url' => RestaurantBrandingUrls::default(),
                            'updated_at' => null,
                        ];
                    }

                    return RestaurantBrandingUrls::sharedPayload(
                        RestaurantSetting::query()->first(),
                    );
                } catch (Throwable $e) {
                    report($e);

                    return [
                        'logo_url' => RestaurantBrandingUrls::default(),
                        'updated_at' => null,
                    ];
                }
            },
            'plan_limits' => static fn () => PlanLimits::snapshot(),
            'active_sede' => static fn () => ActiveSedeContext::sharedPayload(),
        ];
    }

    /**
     * @return list<string>
     */
    private function resolveUserPermissions(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        try {
            if ($user->isPlatformSuperadmin()) {
                $previousTeam = getPermissionsTeamId();
                setPermissionsTeamId(null);

                try {
                    $user->unsetRelation('roles');
                    $user->unsetRelation('permissions');

                    return $user->getAllPermissions()->pluck('name')->values()->all();
                } finally {
                    setPermissionsTeamId($previousTeam);
                    $user->unsetRelation('roles');
                    $user->unsetRelation('permissions');
                }
            }

            return $user->getAllPermissions()->pluck('name')->values()->all();
        } catch (Throwable $e) {
            report($e);
            Log::error('No se pudieron cargar permisos Inertia.', [
                'user_id' => $user->id,
                'exception' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * @return list<string>
     */
    private function resolveUserRoles(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        try {
            if ($user->isPlatformSuperadmin()) {
                return ['superadmin'];
            }

            return $user->getRoleNames()->values()->all();
        } catch (Throwable $e) {
            report($e);

            return [];
        }
    }
}

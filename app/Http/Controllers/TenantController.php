<?php

namespace App\Http\Controllers;

use App\Exports\TenantsXlsxExport;
use App\Http\Requests\TenantRequest;
use App\Models\Departamento;
use App\Models\Plan;
use App\Models\Tenant;
use App\Services\Tenancy\TenantProvisioner;
use App\Tenancy\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class TenantController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'slug',
        'razon_social',
        'estado',
        'trial_ends_at',
        'created_at',
    ];

    private const ESTADO_OPTIONS = ['todos', 'trial', 'active', 'suspended', 'cancelled'];

    private const PLAN_FILTER_NONE = 'sin_plan';

    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true)
            ? $perPageRequested
            : 10;

        $sort = (string) $request->string('sort', '');
        $direction = strtolower((string) $request->string('direction', 'desc'));
        $sortValid = in_array($sort, self::SORTABLE_COLUMNS, true);
        $directionValid = in_array($direction, ['asc', 'desc'], true);

        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, self::ESTADO_OPTIONS, true)) {
            $estado = 'todos';
        }

        $planId = $this->resolvePlanFilter($request);

        $query = $this->buildBaseQuery($search, $estado, $planId);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        $tenants = $query
            ->with([
                'subscriptions' => fn ($q) => $q
                    ->whereIn('estado', ['trial', 'active', 'grace', 'suspended'])
                    ->latest()
                    ->limit(1),
                'subscriptions.plan:id,codigo,nombre,badge,color_hex',
                'distritoModel:id,name,provincia_id',
                'distritoModel.provincia:id,name,departamento_id',
                'distritoModel.provincia.departamento:id,name,pais_id',
            ])
            ->paginate($perPage)
            ->withQueryString();

        $plansCatalog = Plan::query()
            ->where('activo', true)
            ->orderBy('orden')
            ->get(['id', 'codigo', 'nombre', 'trial_days', 'precio_mensual', 'color_hex']);

        $statsByEstado = Tenant::query()
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado')
            ->all();

        return Inertia::render('plataforma/tenants/index', [
            'tenants' => $tenants,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
                'plan_id' => $planId,
            ],
            'stats' => [
                'total' => Tenant::query()->count(),
                'trial' => (int) ($statsByEstado['trial'] ?? 0),
                'active' => (int) ($statsByEstado['active'] ?? 0),
                'suspended' => (int) ($statsByEstado['suspended'] ?? 0),
                'cancelled' => (int) ($statsByEstado['cancelled'] ?? 0),
                'coincidencias' => $tenants->total(),
            ],
            'plans_catalog' => $plansCatalog,
            'departamentos' => Departamento::query()
                ->where('pais_id', (int) config('geo.default_pais_id', 1))
                ->where('status', true)
                ->orderBy('name')
                ->get(['id', 'name']),
            'openwa_configured' => false,
            'win_back_recent' => [],
        ]);
    }

    public function store(TenantRequest $request, TenantProvisioner $provisioner): RedirectResponse
    {
        $data = $request->validated();

        $slug = $data['slug'];
        $schemaName = TenantProvisioner::schemaNameFromSlug($slug);

        if (Tenant::query()->where('schema_name', $schemaName)->exists()) {
            throw ValidationException::withMessages([
                'slug' => 'El schema derivado de ese subdominio ya está en uso. Elige otro slug.',
            ]);
        }

        $trialDays = (int) ($data['trial_days'] ?? 14);

        $tenant = Tenant::create([
            'slug' => $slug,
            'schema_name' => $schemaName,
            'razon_social' => $data['razon_social'],
            'nombre_comercial' => $data['nombre_comercial'] ?? null,
            'ruc' => $data['ruc'] ?? null,
            'email_admin' => $data['email_admin'],
            'telefono' => $data['telefono'] ?? null,
            'distrito_id' => $data['distrito_id'],
            'direccion' => $data['direccion'] ?? null,
            'timezone' => $data['timezone'],
            'locale' => $data['locale'],
            'canal_adquisicion' => $data['canal_adquisicion'] ?? 'manual',
            'estado' => 'trial',
            'trial_ends_at' => now()->addDays($trialDays),
            'onboarding_completado' => false,
            'onboarding_paso' => 0,
        ]);

        try {
            set_time_limit(120);
            $provisioner->ensurePhysicalSchema($tenant);
        } catch (Throwable $e) {
            report($e);

            return back()->with(
                'warning',
                'Tenant creado en el listado, pero falló el schema del restaurante: '.$e->getMessage()
                .' Usá «Crear schema» en las acciones de la fila.',
            );
        }

        return back()->with(
            'success',
            'Tenant creado con schema, tablas y roles. Creá la suscripción en Plataforma → Suscripciones.',
        );
    }

    public function provisionSchema(Tenant $tenant, TenantProvisioner $provisioner): RedirectResponse
    {
        if ($tenant->estado === 'cancelled') {
            throw ValidationException::withMessages([
                'tenant' => 'No se puede crear el schema de un tenant cancelado.',
            ]);
        }

        try {
            set_time_limit(120);
            $provisioner->ensurePhysicalSchema($tenant);
        } catch (Throwable $e) {
            report($e);

            return back()->with('error', 'No se pudo crear el schema: '.$e->getMessage());
        }

        return back()->with(
            'success',
            "Schema listo para {$tenant->razon_social}.",
        );
    }

    public function update(TenantRequest $request, Tenant $tenant, TenantManager $manager): RedirectResponse
    {
        $data = $request->validated();

        if ($tenant->slug !== $data['slug'] && in_array($tenant->estado, ['active', 'suspended'], true)) {
            throw ValidationException::withMessages([
                'slug' => 'No puedes cambiar el subdominio de un tenant que ya está en producción (estado active/suspended).',
            ]);
        }

        $payload = [
            'slug' => $data['slug'],
            'razon_social' => $data['razon_social'],
            'nombre_comercial' => $data['nombre_comercial'] ?? null,
            'ruc' => $data['ruc'] ?? null,
            'email_admin' => $data['email_admin'],
            'telefono' => $data['telefono'] ?? null,
            'distrito_id' => $data['distrito_id'],
            'direccion' => $data['direccion'] ?? null,
            'timezone' => $data['timezone'],
            'locale' => $data['locale'],
            'canal_adquisicion' => $data['canal_adquisicion'] ?? null,
        ];

        if ($tenant->estado === 'trial' && $tenant->slug !== $data['slug']) {
            $newSchema = TenantProvisioner::schemaNameFromSlug($data['slug']);
            if (Tenant::query()->where('schema_name', $newSchema)->whereKeyNot($tenant->id)->exists()) {
                throw ValidationException::withMessages([
                    'slug' => 'El schema derivado de ese subdominio ya está en uso. Elige otro slug.',
                ]);
            }
            $payload['schema_name'] = $newSchema;
        }

        $tenant->update($payload);
        $manager->flushCacheFor($tenant->fresh() ?? $tenant);

        return back()->with('success', 'Tenant actualizado correctamente.');
    }

    public function suspend(Request $request, Tenant $tenant, TenantManager $manager): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        if ($tenant->estado === 'suspended') {
            return back()->with('info', 'El tenant ya estaba suspendido.');
        }

        if ($tenant->estado === 'cancelled') {
            throw ValidationException::withMessages([
                'reason' => 'No se puede suspender un tenant cancelado.',
            ]);
        }

        $tenant->update([
            'estado' => 'suspended',
            'suspended_at' => now(),
            'suspension_reason' => $data['reason'],
        ]);

        $subscription = $tenant->subscriptions()
            ->whereIn('estado', ['trial', 'active', 'grace'])
            ->orderByDesc('created_at')
            ->first();

        if ($subscription !== null) {
            $subscription->update([
                'estado' => 'suspended',
                'grace_ends_at' => null,
            ]);
        }

        $manager->flushCacheFor($tenant->fresh() ?? $tenant);

        return back()->with('success', 'Tenant suspendido correctamente.');
    }

    public function resume(Tenant $tenant, TenantManager $manager): RedirectResponse
    {
        if ($tenant->estado !== 'suspended') {
            throw ValidationException::withMessages([
                'estado' => 'Solo se puede reanudar un tenant suspendido.',
            ]);
        }

        $subscription = $tenant->subscriptions()
            ->whereIn('estado', ['suspended', 'grace', 'active', 'trial'])
            ->orderByDesc('created_at')
            ->first();

        if ($subscription !== null) {
            $subscription->update([
                'estado' => 'grace',
                'grace_ends_at' => now()->addDay(),
            ]);

            $manager->flushCacheFor($tenant->fresh() ?? $tenant);

            return back()->with(
                'success',
                'Tenant reanudado con 1 día de gracia en su suscripción.',
            );
        }

        $tenant->update([
            'estado' => 'active',
            'suspended_at' => null,
            'suspension_reason' => null,
        ]);

        $manager->flushCacheFor($tenant);

        return back()->with('success', 'Tenant reanudado correctamente.');
    }

    public function destroy(Tenant $tenant, TenantManager $manager): RedirectResponse
    {
        if ($tenant->estado === 'active') {
            throw ValidationException::withMessages([
                'id' => 'No se puede eliminar un tenant activo. Cancélalo o suspéndelo primero.',
            ]);
        }

        $tenant->update([
            'estado' => 'cancelled',
            'cancelled_at' => $tenant->cancelled_at ?? now(),
        ]);
        $tenant->delete();

        $manager->flushCacheFor($tenant);

        return back()->with('success', 'Tenant eliminado (soft delete) correctamente.');
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['uuid'],
        ]);

        $count = Tenant::query()
            ->whereIn('id', $data['ids'])
            ->whereNotIn('estado', ['active'])
            ->update([
                'estado' => 'cancelled',
                'cancelled_at' => now(),
            ]);

        Tenant::query()
            ->whereIn('id', $data['ids'])
            ->whereNotIn('estado', ['active'])
            ->delete();

        if ($count === 0) {
            return back()->with(
                'info',
                'No se eliminó ningún tenant activo. Suspende o cancela antes de borrar.',
            );
        }

        $message = $count === 1
            ? '1 tenant eliminado correctamente.'
            : "{$count} tenants eliminados correctamente.";

        return back()->with('success', $message);
    }

    public function export(Request $request): StreamedResponse
    {
        $search = trim((string) $request->string('search', ''));
        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, self::ESTADO_OPTIONS, true)) {
            $estado = 'todos';
        }

        $planId = $this->resolvePlanFilter($request);

        $sort = (string) $request->string('sort', '');
        $direction = strtolower((string) $request->string('direction', 'desc'));
        $sortValid = in_array($sort, self::SORTABLE_COLUMNS, true);
        $directionValid = in_array($direction, ['asc', 'desc'], true);

        $query = $this->buildBaseQuery($search, $estado, $planId)
            ->with([
                'subscriptions' => fn ($q) => $q
                    ->whereIn('estado', ['trial', 'active', 'grace'])
                    ->latest()
                    ->limit(1),
                'subscriptions.plan:id,codigo,nombre',
            ]);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        $filename = 'tenants-'.now()->format('Ymd-His').'.xlsx';
        $exporter = new TenantsXlsxExport;

        return response()->streamDownload(
            fn () => $exporter->streamTo($query),
            $filename,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control' => 'no-store, no-cache, must-revalidate',
                'Pragma' => 'no-cache',
            ],
        );
    }

    /**
     * @return Builder<Tenant>
     */
    private function buildBaseQuery(string $search, string $estado, ?string $planId): Builder
    {
        $query = Tenant::query();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('slug', 'ILIKE', "%{$search}%")
                    ->orWhere('razon_social', 'ILIKE', "%{$search}%")
                    ->orWhere('nombre_comercial', 'ILIKE', "%{$search}%")
                    ->orWhere('email_admin', 'ILIKE', "%{$search}%")
                    ->orWhere('ruc', 'ILIKE', "%{$search}%");
            });
        }

        if ($estado !== 'todos') {
            $query->where('estado', $estado);
        }

        if ($planId === self::PLAN_FILTER_NONE) {
            $query->whereDoesntHave(
                'subscriptions',
                fn ($q) => $q->whereIn('estado', ['trial', 'active', 'grace']),
            );
        } elseif ($planId !== null) {
            $query->whereHas(
                'subscriptions',
                fn ($q) => $q
                    ->whereIn('estado', ['trial', 'active', 'grace'])
                    ->where('plan_id', $planId),
            );
        }

        return $query;
    }

    private function resolvePlanFilter(Request $request): ?string
    {
        $planId = trim((string) $request->string('plan_id', ''));

        if ($planId === '' || $planId === 'todos') {
            return null;
        }

        if ($planId === self::PLAN_FILTER_NONE) {
            return self::PLAN_FILTER_NONE;
        }

        if (! Plan::query()->whereKey($planId)->exists()) {
            return null;
        }

        return $planId;
    }
}

<?php

namespace App\Http\Controllers;

use App\Exports\SubscriptionsXlsxExport;
use App\Http\Requests\SubscriptionRequest;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Support\Subscriptions\SubscriptionCiclo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SubscriptionController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'estado',
        'ciclo',
        'precio_pactado',
        'trial_ends_at',
        'current_period_end',
        'proximo_cobro_at',
        'created_at',
    ];

    private const ESTADO_OPTIONS = ['todos', 'trial', 'active', 'grace', 'suspended', 'cancelled'];

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

        $planId = trim((string) $request->string('plan_id', ''));

        $query = $this->buildBaseQuery($search, $estado, $planId);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        $subscriptions = $query
            ->with([
                'tenant:id,slug,razon_social,nombre_comercial,email_admin',
                'plan:id,codigo,nombre,badge,color_hex',
            ])
            ->paginate($perPage)
            ->withQueryString();

        $plansCatalog = Plan::query()
            ->orderBy('orden')
            ->get(['id', 'codigo', 'nombre', 'trial_days', 'precio_mensual', 'precio_anual', 'badge', 'color_hex']);

        $tenantsCatalog = Tenant::query()
            ->whereNotIn('estado', ['cancelled'])
            ->orderBy('razon_social')
            ->get(['id', 'slug', 'razon_social']);

        $statsByEstado = Subscription::query()
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado')
            ->all();

        $mrr = (float) Subscription::query()
            ->whereIn('estado', ['active', 'grace'])
            ->when($planId !== '', fn ($q) => $q->where('plan_id', $planId))
            ->sum('precio_pactado');

        return Inertia::render('plataforma/suscripciones/index', [
            'subscriptions' => $subscriptions,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
                'plan_id' => $planId !== '' ? $planId : null,
            ],
            'stats' => [
                'total' => Subscription::query()->count(),
                'trial' => (int) ($statsByEstado['trial'] ?? 0),
                'active' => (int) ($statsByEstado['active'] ?? 0),
                'grace' => (int) ($statsByEstado['grace'] ?? 0),
                'suspended' => (int) ($statsByEstado['suspended'] ?? 0),
                'cancelled' => (int) ($statsByEstado['cancelled'] ?? 0),
                'mrr' => $mrr,
                'mrr_by_plan' => [],
                'coincidencias' => $subscriptions->total(),
            ],
            'plans_catalog' => $plansCatalog,
            'tenants_catalog' => $tenantsCatalog,
        ]);
    }

    public function store(SubscriptionRequest $request): RedirectResponse
    {
        Subscription::create($request->validated());

        return back()->with('success', 'Suscripción creada correctamente.');
    }

    public function update(SubscriptionRequest $request, Subscription $suscripcion): RedirectResponse
    {
        $suscripcion->update($request->validated());

        return back()->with('success', 'Suscripción actualizada correctamente.');
    }

    public function extendTrial(Request $request, Subscription $suscripcion): RedirectResponse
    {
        $data = $request->validate([
            'days' => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        if ($suscripcion->estado === 'cancelled') {
            throw ValidationException::withMessages([
                'days' => 'No se puede extender el trial de una suscripción cancelada.',
            ]);
        }

        $base = $suscripcion->trial_ends_at && $suscripcion->trial_ends_at->isFuture()
            ? $suscripcion->trial_ends_at
            : now();

        $suscripcion->update([
            'estado' => 'trial',
            'trial_ends_at' => $base->copy()->addDays((int) $data['days']),
        ]);

        return back()->with(
            'success',
            sprintf('Trial extendido %d día%s.', $data['days'], $data['days'] === 1 ? '' : 's'),
        );
    }

    public function changePlan(Request $request, Subscription $suscripcion): RedirectResponse
    {
        $data = $request->validate([
            'plan_id' => ['required', 'uuid', 'exists:plans,id'],
            'keep_price' => ['nullable', 'boolean'],
        ]);

        if ($suscripcion->estado === 'cancelled') {
            throw ValidationException::withMessages([
                'plan_id' => 'No se puede cambiar el plan de una suscripción cancelada.',
            ]);
        }

        $newPlan = Plan::query()->findOrFail($data['plan_id']);

        $payload = ['plan_id' => $newPlan->id];

        if (! ($data['keep_price'] ?? false)) {
            $payload['precio_pactado'] = SubscriptionCiclo::suggestedPriceFromPlan(
                (float) $newPlan->precio_mensual,
                $newPlan->precio_anual !== null ? (float) $newPlan->precio_anual : null,
                (string) $suscripcion->ciclo,
            );
        }

        $suscripcion->update($payload);

        return back()->with('success', "Plan cambiado a {$newPlan->nombre}.");
    }

    public function cancel(Request $request, Subscription $suscripcion): RedirectResponse
    {
        $data = $request->validate([
            'cancel_reason' => ['required', 'string', 'min:5', 'max:500'],
            'cancel_feedback' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($suscripcion->estado === 'cancelled') {
            return back()->with('info', 'La suscripción ya estaba cancelada.');
        }

        $suscripcion->update([
            'estado' => 'cancelled',
            'cancelled_at' => now(),
            'cancel_reason' => $data['cancel_reason'],
            'cancel_feedback' => $data['cancel_feedback'] ?? null,
            'grace_ends_at' => null,
            'proximo_cobro_at' => null,
        ]);

        return back()->with('success', 'Suscripción cancelada correctamente.');
    }

    public function destroy(Subscription $suscripcion): RedirectResponse
    {
        $suscripcion->delete();

        return back()->with('success', 'Suscripción eliminada del historial.');
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['uuid'],
        ]);

        $count = Subscription::whereIn('id', $data['ids'])->delete();

        $message = $count === 1
            ? '1 suscripción eliminada.'
            : "{$count} suscripciones eliminadas.";

        return back()->with('success', $message);
    }

    public function export(Request $request): StreamedResponse
    {
        $search = trim((string) $request->string('search', ''));
        $estado = (string) $request->string('estado', 'todos');
        $planId = trim((string) $request->string('plan_id', ''));

        $query = $this->buildBaseQuery($search, $estado, $planId)
            ->with(['tenant:id,slug,razon_social', 'plan:id,codigo,nombre'])
            ->orderByDesc('created_at');

        $filename = 'suscripciones-'.now()->format('Ymd-His').'.xlsx';
        $exporter = new SubscriptionsXlsxExport;

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
     * @return Builder<Subscription>
     */
    private function buildBaseQuery(string $search, string $estado, string $planId): Builder
    {
        $query = Subscription::query();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->whereHas(
                    'tenant',
                    fn ($t) => $t->where('slug', 'ILIKE', "%{$search}%")
                        ->orWhere('razon_social', 'ILIKE', "%{$search}%")
                        ->orWhere('email_admin', 'ILIKE', "%{$search}%"),
                )->orWhereHas(
                    'plan',
                    fn ($p) => $p->where('codigo', 'ILIKE', "%{$search}%")
                        ->orWhere('nombre', 'ILIKE', "%{$search}%"),
                );
            });
        }

        if ($estado !== 'todos') {
            $query->where('estado', $estado);
        }

        if ($planId !== '') {
            $query->where('plan_id', $planId);
        }

        return $query;
    }
}

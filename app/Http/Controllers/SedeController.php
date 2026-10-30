<?php

namespace App\Http\Controllers;

use App\Exports\SedesXlsxExport;
use App\Http\Requests\SedeRequest;
use App\Models\Departamento;
use App\Models\Distrito;
use App\Models\Sede;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SedeController extends Controller
{
    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'codigo',
        'nombre',
        'distrito',
        'provincia',
        'departamento',
        'telefono',
        'activa',
        'created_at',
    ];

    private const ESTADO_OPTIONS = ['todas', 'activa', 'inactiva'];

    private function tenantIdOrAbort(): string
    {
        $id = tenant_id();
        abort_if($id === null || $id === '', 403, 'Solo usuarios de restaurante pueden gestionar sedes.');

        return (string) $id;
    }

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

        $estado = (string) $request->string('estado', 'todas');
        if (! in_array($estado, self::ESTADO_OPTIONS, true)) {
            $estado = 'todas';
        }

        $tenantId = $this->tenantIdOrAbort();

        $query = Sede::query()->where('tenant_id', $tenantId);

        if ($sortValid) {
            $query->orderBy($sort, $directionValid ? $direction : 'asc');
            $query->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        $query->with(['distritoModel.provincia.departamento', 'creadoPor:id,name']);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'ILIKE', "%{$search}%")
                    ->orWhere('codigo', 'ILIKE', "%{$search}%")
                    ->orWhere('direccion', 'ILIKE', "%{$search}%")
                    ->orWhere('distrito', 'ILIKE', "%{$search}%")
                    ->orWhere('email', 'ILIKE', "%{$search}%");
            });
        }

        if ($estado === 'activa') {
            $query->where('activa', true);
        } elseif ($estado === 'inactiva') {
            $query->where('activa', false);
        }

        $sedes = $query->paginate($perPage)->withQueryString();

        $departamentos = Departamento::query()
            ->where('status', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('configuracion/sedes/index', [
            'sedes' => $sedes,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => $sortValid ? $sort : null,
                'direction' => $sortValid && $directionValid ? $direction : null,
                'estado' => $estado,
            ],
            'stats' => [
                'total' => Sede::where('tenant_id', $tenantId)->count(),
                'activas' => Sede::where('tenant_id', $tenantId)->where('activa', true)->count(),
                'inactivas' => Sede::where('tenant_id', $tenantId)->where('activa', false)->count(),
                'coincidencias' => $sedes->total(),
            ],
            'departamentos' => $departamentos,
            'mutations_locked' => demo_mutations_locked(),
        ]);
    }

    public function store(SedeRequest $request): RedirectResponse
    {
        $tenantId = $this->tenantIdOrAbort();
        $userId = Auth::id();
        $data = $this->hydrateLocationFromDistrito($request->validated());

        Sede::create([
            ...$data,
            'tenant_id' => $tenantId,
            'codigo' => Sede::generateNextCode($tenantId),
            'created_by_id' => $userId,
            'updated_by_id' => $userId,
        ]);

        return back()->with('success', 'Sede creada correctamente.');
    }

    public function update(SedeRequest $request, Sede $sede): RedirectResponse
    {
        $this->assertSedeBelongsToTenant($sede);
        $data = $this->hydrateLocationFromDistrito($request->validated());

        $sede->update([
            ...$data,
            'updated_by_id' => Auth::id(),
        ]);

        return back()->with('success', 'Sede actualizada correctamente.');
    }

    public function destroy(Request $request, Sede $sede): RedirectResponse
    {
        $this->assertSedeBelongsToTenant($sede);
        $sede->update(['updated_by_id' => Auth::id()]);
        $sede->delete();

        return back()->with('success', 'Sede eliminada correctamente.');
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $tenantId = $this->tenantIdOrAbort();
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['uuid'],
        ]);

        $userId = Auth::id();

        Sede::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $data['ids'])
            ->update(['updated_by_id' => $userId]);

        $count = Sede::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $data['ids'])
            ->delete();

        return back()->with(
            'success',
            $count === 1
                ? '1 sede eliminada correctamente.'
                : "{$count} sedes eliminadas correctamente.",
        );
    }

    public function export(Request $request): StreamedResponse
    {
        $search = trim((string) $request->string('search', ''));
        $estado = (string) $request->string('estado', 'todas');
        if (! in_array($estado, self::ESTADO_OPTIONS, true)) {
            $estado = 'todas';
        }

        $tenantId = $this->tenantIdOrAbort();
        $query = Sede::query()->where('tenant_id', $tenantId)->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'ILIKE', "%{$search}%")
                    ->orWhere('codigo', 'ILIKE', "%{$search}%")
                    ->orWhere('direccion', 'ILIKE', "%{$search}%")
                    ->orWhere('distrito', 'ILIKE', "%{$search}%")
                    ->orWhere('email', 'ILIKE', "%{$search}%");
            });
        }

        if ($estado === 'activa') {
            $query->where('activa', true);
        } elseif ($estado === 'inactiva') {
            $query->where('activa', false);
        }

        $filename = 'sedes-'.now()->format('Ymd-His').'.xlsx';
        $exporter = new SedesXlsxExport;

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
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function hydrateLocationFromDistrito(array $data): array
    {
        $distritoId = $data['distrito_id'] ?? null;

        if ($distritoId === null) {
            $data['distrito'] = null;
            $data['provincia'] = null;
            $data['departamento'] = null;

            return $data;
        }

        $distrito = Distrito::query()
            ->with('provincia.departamento')
            ->find($distritoId);

        if ($distrito === null) {
            $data['distrito'] = null;
            $data['provincia'] = null;
            $data['departamento'] = null;

            return $data;
        }

        $data['distrito'] = $distrito->name;
        $data['provincia'] = $distrito->provincia?->name;
        $data['departamento'] = $distrito->provincia?->departamento?->name;

        return $data;
    }

    private function assertSedeBelongsToTenant(Sede $sede): void
    {
        abort_unless($sede->tenant_id === $this->tenantIdOrAbort(), 404);
    }
}

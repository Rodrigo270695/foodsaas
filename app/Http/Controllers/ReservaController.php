<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\Mesa;
use App\Models\Reserva;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ReservaController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50];

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';

        [$desde, $hasta] = $this->resolveRange($request);
        $estado = (string) $request->string('estado', 'todas');
        if ($estado !== 'todas' && ! in_array($estado, Reserva::ESTADOS, true)) {
            $estado = 'todas';
        }

        $search = trim((string) $request->string('search', ''));
        $perPage = (int) $request->integer('per_page', 15);
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 15;
        }

        $base = Reserva::query()
            ->when($sedeId !== '', fn ($q) => $q->where('sede_id', $sedeId), fn ($q) => $q->whereRaw('1 = 0'));

        $query = (clone $base)
            ->with(['mesa:id,codigo,nombre', 'createdBy:id,name'])
            ->whereDate('reserved_at', '>=', $desde)
            ->whereDate('reserved_at', '<=', $hasta)
            ->orderBy('reserved_at');

        if ($estado !== 'todas') {
            $query->where('estado', $estado);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('cliente_nombre', 'ilike', "%{$search}%")
                    ->orWhere('cliente_telefono', 'ilike', "%{$search}%")
                    ->orWhere('notas', 'ilike', "%{$search}%");
            });
        }

        $reservas = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Reserva $r) => [
                'id' => $r->id,
                'cliente_nombre' => $r->cliente_nombre,
                'cliente_telefono' => $r->cliente_telefono,
                'personas' => $r->personas,
                'reserved_at' => $r->reserved_at?->toIso8601String(),
                'estado' => $r->estado,
                'notas' => $r->notas,
                'mesa' => $r->mesa ? [
                    'id' => $r->mesa->id,
                    'codigo' => $r->mesa->codigo,
                    'nombre' => $r->mesa->nombre,
                ] : null,
                'created_by' => $r->createdBy?->name,
            ]);

        $mesas = $sedeId !== ''
            ? Mesa::query()
                ->where('sede_id', $sedeId)
                ->where('activa', true)
                ->orderBy('codigo')
                ->get(['id', 'codigo', 'nombre', 'capacidad'])
            : collect();

        $hoy = now()->toDateString();
        $pendientes = (clone $base)
            ->whereDate('reserved_at', '>=', $hoy)
            ->whereIn('estado', [Reserva::ESTADO_PENDIENTE, Reserva::ESTADO_CONFIRMADA])
            ->count();
        $hoyCount = (clone $base)->whereDate('reserved_at', $hoy)->count();

        $activeFilters = 0;
        if ($estado !== 'todas') {
            $activeFilters++;
        }
        if ($search !== '') {
            $activeFilters++;
        }
        if ($desde !== $hoy || $hasta !== $hoy) {
            $activeFilters++;
        }

        return Inertia::render('reservas/index', [
            'reservas' => $reservas,
            'mesas' => $mesas,
            'filters' => [
                'search' => $search,
                'estado' => $estado,
                'desde' => $desde,
                'hasta' => $hasta,
                'per_page' => $perPage,
                'sort' => null,
                'direction' => null,
            ],
            'estados' => Reserva::ESTADOS,
            'stats' => [
                'hoy' => $hoyCount,
                'pendientes' => $pendientes,
                'filtros' => $activeFilters,
                'coincidencias' => $reservas->total(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();
        $data = $this->validated($request, $sedeId);

        Reserva::query()->create([
            ...$data,
            'sede_id' => $sedeId,
            'estado' => Reserva::ESTADO_PENDIENTE,
            'created_by' => Auth::id(),
        ]);

        return back()->with('success', 'Reserva creada.');
    }

    public function update(Request $request, Reserva $reserva): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $data = $this->validated($request, (string) $reserva->sede_id, true);
        $reserva->update($data);

        return back()->with('success', 'Reserva actualizada.');
    }

    public function destroy(Reserva $reserva): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $reserva->delete();

        return back()->with('success', 'Reserva eliminada.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, string $sedeId, bool $withEstado = false): array
    {
        $request->merge([
            'mesa_id' => $request->filled('mesa_id') ? $request->input('mesa_id') : null,
            'cliente_telefono' => $request->filled('cliente_telefono')
                ? trim((string) $request->input('cliente_telefono'))
                : null,
            'notas' => $request->filled('notas') ? trim((string) $request->input('notas')) : null,
        ]);

        $rules = [
            'mesa_id' => [
                'nullable',
                'uuid',
                Rule::exists('cfg_mesas', 'id')->where(fn ($q) => $q->where('sede_id', $sedeId)),
            ],
            'cliente_nombre' => ['required', 'string', 'max:180'],
            'cliente_telefono' => ['nullable', 'string', 'max:40'],
            'personas' => ['required', 'integer', 'min:1', 'max:99'],
            'reserved_at' => ['required', 'date'],
            'notas' => ['nullable', 'string', 'max:2000'],
        ];

        if ($withEstado) {
            $rules['estado'] = ['required', Rule::in(Reserva::ESTADOS)];
        }

        $data = $request->validate($rules);

        return [
            'mesa_id' => $data['mesa_id'] ?? null,
            'cliente_nombre' => trim((string) $data['cliente_nombre']),
            'cliente_telefono' => $data['cliente_telefono'] ?? null,
            'personas' => (int) $data['personas'],
            'reserved_at' => $data['reserved_at'],
            'notas' => $data['notas'] ?? null,
            ...($withEstado ? ['estado' => $data['estado']] : []),
        ];
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function resolveRange(Request $request): array
    {
        $parseDate = static function (string $value): string {
            $value = trim($value);

            return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 ? $value : '';
        };

        $desde = $parseDate((string) $request->string('desde', ''));
        $hasta = $parseDate((string) $request->string('hasta', ''));
        $fechaLegacy = $parseDate((string) $request->string('fecha', ''));
        $hoy = now()->toDateString();

        if ($desde === '' && $hasta === '' && $fechaLegacy !== '') {
            return [$fechaLegacy, $fechaLegacy];
        }
        if ($desde === '' && $hasta === '') {
            return [$hoy, $hoy];
        }
        if ($desde === '') {
            $desde = $hasta;
        }
        if ($hasta === '') {
            $hasta = $desde;
        }
        if ($desde > $hasta) {
            [$desde, $hasta] = [$hasta, $desde];
        }

        return [$desde, $hasta];
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\Oferta;
use App\Services\Marketing\OfertaService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OfertaController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50];

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';

        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, ['activos', 'inactivos', 'todos'], true)) {
            $estado = 'todos';
        }

        $search = trim((string) $request->string('search', ''));
        $perPage = (int) $request->integer('per_page', 10);
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 10;
        }

        $base = Oferta::query()
            ->when(
                $sedeId !== '',
                fn ($q) => $q->where(function ($inner) use ($sedeId): void {
                    $inner->whereNull('sede_id')->orWhere('sede_id', $sedeId);
                }),
                fn ($q) => $q->whereRaw('1 = 0'),
            );

        $query = (clone $base)->orderByDesc('activa')->orderBy('codigo');

        if ($estado === 'activos') {
            $query->where('activa', true);
        } elseif ($estado === 'inactivos') {
            $query->where('activa', false);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('codigo', 'ilike', "%{$search}%")
                    ->orWhere('nombre', 'ilike', "%{$search}%");
            });
        }

        $ofertas = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Oferta $o) => $this->serialize($o));

        $total = (clone $base)->count();
        $activos = (clone $base)->where('activa', true)->count();
        $vigentesHoy = (clone $base)
            ->where('activa', true)
            ->get()
            ->filter(fn (Oferta $o) => $o->isVigenteHoy())
            ->count();

        return Inertia::render('ofertas/index', [
            'ofertas' => $ofertas,
            'filters' => [
                'search' => $search,
                'estado' => $estado,
                'per_page' => $perPage,
                'sort' => null,
                'direction' => null,
            ],
            'stats' => [
                'total' => $total,
                'activos' => $activos,
                'vigentes' => $vigentesHoy,
                'filtros' => ($estado !== 'todos' ? 1 : 0) + ($search !== '' ? 1 : 0),
                'coincidencias' => $ofertas->total(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();
        $data = $this->validated($request);

        Oferta::query()->create([
            ...$data,
            'sede_id' => $sedeId,
            'codigo' => strtoupper((string) $data['codigo']),
            'usos_count' => 0,
        ]);

        return back()->with('success', 'Oferta creada.');
    }

    public function update(Request $request, Oferta $oferta): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertSede($oferta);
        $data = $this->validated($request, $oferta->id);
        $data['codigo'] = strtoupper((string) $data['codigo']);
        $oferta->update($data);

        return back()->with('success', 'Oferta actualizada.');
    }

    public function destroy(Oferta $oferta): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertSede($oferta);
        $oferta->delete();

        return back()->with('success', 'Oferta eliminada.');
    }

    public function preview(Request $request, OfertaService $service): JsonResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id();

        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:40'],
            'subtotal' => ['required', 'numeric', 'min:0'],
        ]);

        $resolved = $service->resolver(
            (string) $data['codigo'],
            (float) $data['subtotal'],
            $sedeId,
        );

        return response()->json([
            'oferta_id' => $resolved['oferta']->id,
            'codigo' => $resolved['oferta']->codigo,
            'nombre' => $resolved['oferta']->nombre,
            'descuento' => $resolved['descuento'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Oferta $o): array
    {
        return [
            'id' => $o->id,
            'codigo' => $o->codigo,
            'nombre' => $o->nombre,
            'tipo' => $o->tipo,
            'valor' => (float) $o->valor,
            'tope_monto' => $o->tope_monto !== null ? (float) $o->tope_monto : null,
            'usos_max' => $o->usos_max,
            'usos_count' => $o->usos_count,
            'vigente_desde' => $o->vigente_desde?->toDateString(),
            'vigente_hasta' => $o->vigente_hasta?->toDateString(),
            'activa' => $o->activa,
            'vigente_hoy' => $o->isVigenteHoy(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?string $ignoreId = null): array
    {
        $data = $request->validate([
            'codigo' => [
                'required',
                'string',
                'max:40',
                Rule::unique('mkt_ofertas', 'codigo')->ignore($ignoreId),
            ],
            'nombre' => ['required', 'string', 'max:150'],
            'tipo' => ['required', Rule::in([Oferta::TIPO_MONTO, Oferta::TIPO_PORCENTAJE])],
            'valor' => ['required', 'numeric', 'min:0.01'],
            'tope_monto' => ['nullable', 'numeric', 'min:0'],
            'usos_max' => ['nullable', 'integer', 'min:1'],
            'vigente_desde' => ['nullable', 'date'],
            'vigente_hasta' => ['nullable', 'date', 'after_or_equal:vigente_desde'],
            'activa' => ['sometimes', 'boolean'],
        ]);

        $data['activa'] = $request->boolean('activa', true);
        $data['tope_monto'] = array_key_exists('tope_monto', $data) && $data['tope_monto'] !== null
            ? round((float) $data['tope_monto'], 2)
            : null;
        $data['usos_max'] = array_key_exists('usos_max', $data) && $data['usos_max'] !== null
            ? (int) $data['usos_max']
            : null;
        $data['vigente_desde'] = $data['vigente_desde'] ?? null;
        $data['vigente_hasta'] = $data['vigente_hasta'] ?? null;

        return $data;
    }

    private function assertSede(Oferta $oferta): void
    {
        if ($oferta->sede_id !== null) {
            ActiveSedeContext::assertAccessible((string) $oferta->sede_id);
        }
    }
}

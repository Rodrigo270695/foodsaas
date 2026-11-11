<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\Insumo;
use App\Models\ProductoCarta;
use App\Models\Sede;
use App\Models\Transferencia;
use App\Models\TransferenciaLinea;
use App\Services\Inventario\TransferenciaStockService;
use App\Support\Plan\PlanCapabilities;
use App\Support\Sedes\ActiveSedeContext;
use App\Tenancy\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TransferenciaController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $this->assertModule();

        $sedeId = ActiveSedeContext::id() ?? '';
        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, ['todos', ...Transferencia::ESTADOS], true)) {
            $estado = 'todos';
        }

        $query = Transferencia::query()
            ->with(['sedeOrigen:id,nombre', 'sedeDestino:id,nombre'])
            ->withCount('lineas')
            ->orderByDesc('numero');

        if ($sedeId !== '') {
            $query->where(function ($q) use ($sedeId): void {
                $q->where('sede_origen_id', $sedeId)->orWhere('sede_destino_id', $sedeId);
            });
        }

        if ($estado !== 'todos') {
            $query->where('estado', $estado);
        }

        $rows = $query->paginate(15)->withQueryString()->through(fn (Transferencia $t) => [
            'id' => $t->id,
            'numero' => $t->numero,
            'estado' => $t->estado,
            'origen' => $t->sedeOrigen?->nombre,
            'destino' => $t->sedeDestino?->nombre,
            'lineas_count' => $t->lineas_count,
            'enviada_at' => $t->enviada_at?->toIso8601String(),
            'recibida_at' => $t->recibida_at?->toIso8601String(),
        ]);

        return Inertia::render('transferencias/index', [
            'transferencias' => $rows,
            'filters' => ['estado' => $estado],
            'stats' => [
                'total' => Transferencia::query()->count(),
                'enviadas' => Transferencia::query()->where('estado', Transferencia::ESTADO_ENVIADA)->count(),
                'recibidas' => Transferencia::query()->where('estado', Transferencia::ESTADO_RECIBIDA)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        $this->tenantIdOrAbort();
        $this->assertModule();
        $sedeId = $this->activeSedeIdOrAbort();

        return Inertia::render('transferencias/form', [
            'transferencia' => null,
            'sedes' => $this->sedesOptions(),
            'origen_items' => $this->itemsForSede($sedeId),
            'default_origen_id' => $sedeId,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertModule();

        $data = $request->validate([
            'sede_origen_id' => ['required', 'uuid', Rule::exists('sedes', 'id')],
            'sede_destino_id' => ['required', 'uuid', 'different:sede_origen_id', Rule::exists('sedes', 'id')],
            'notas' => ['nullable', 'string', 'max:500'],
            'lineas' => ['required', 'array', 'min:1'],
            'lineas.*.linea_tipo' => ['required', Rule::in(['insumo', 'producto'])],
            'lineas.*.origen_id' => ['required', 'uuid'],
            'lineas.*.destino_id' => ['required', 'uuid'],
            'lineas.*.cantidad' => ['required', 'numeric', 'gt:0'],
            'lineas.*.unidad' => ['nullable', 'string', 'max:20'],
        ]);

        $numero = ((int) Transferencia::query()
            ->where('sede_origen_id', $data['sede_origen_id'])
            ->max('numero')) + 1;

        $tf = Transferencia::query()->create([
            'sede_origen_id' => $data['sede_origen_id'],
            'sede_destino_id' => $data['sede_destino_id'],
            'numero' => $numero,
            'estado' => Transferencia::ESTADO_BORRADOR,
            'notas' => $data['notas'] ?? null,
            'user_id' => Auth::id(),
        ]);

        foreach ($data['lineas'] as $linea) {
            $payload = [
                'transferencia_id' => $tf->id,
                'linea_tipo' => $linea['linea_tipo'],
                'cantidad' => $linea['cantidad'],
                'unidad' => $linea['unidad'] ?? 'und',
            ];
            if ($linea['linea_tipo'] === 'insumo') {
                $payload['origen_insumo_id'] = $linea['origen_id'];
                $payload['destino_insumo_id'] = $linea['destino_id'];
            } else {
                $payload['origen_producto_id'] = $linea['origen_id'];
                $payload['destino_producto_id'] = $linea['destino_id'];
            }
            TransferenciaLinea::query()->create($payload);
        }

        return redirect()
            ->route('transferencias.show', $tf)
            ->with('success', 'Transferencia #'.$tf->numero.' creada.');
    }

    public function show(Transferencia $transferencia): Response
    {
        $this->tenantIdOrAbort();
        $this->assertModule();
        $transferencia->load([
            'sedeOrigen:id,nombre',
            'sedeDestino:id,nombre',
            'lineas.origenInsumo:id,nombre,unidad',
            'lineas.destinoInsumo:id,nombre,unidad',
            'lineas.origenProducto:id,nombre',
            'lineas.destinoProducto:id,nombre',
        ]);

        return Inertia::render('transferencias/show', [
            'transferencia' => [
                'id' => $transferencia->id,
                'numero' => $transferencia->numero,
                'estado' => $transferencia->estado,
                'notas' => $transferencia->notas,
                'origen' => $transferencia->sedeOrigen?->nombre,
                'destino' => $transferencia->sedeDestino?->nombre,
                'can_enviar' => $transferencia->canEnviar(),
                'can_recibir' => $transferencia->canRecibir(),
                'can_anular' => $transferencia->canAnular(),
                'lineas' => $transferencia->lineas->map(fn (TransferenciaLinea $l) => [
                    'id' => $l->id,
                    'tipo' => $l->linea_tipo,
                    'origen' => $l->linea_tipo === 'insumo'
                        ? $l->origenInsumo?->nombre
                        : $l->origenProducto?->nombre,
                    'destino' => $l->linea_tipo === 'insumo'
                        ? $l->destinoInsumo?->nombre
                        : $l->destinoProducto?->nombre,
                    'cantidad' => (float) $l->cantidad,
                    'unidad' => $l->unidad,
                ]),
            ],
        ]);
    }

    public function enviar(Transferencia $transferencia, TransferenciaStockService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertModule();
        $service->enviar($transferencia);

        return back()->with('success', 'Transferencia enviada (salida de stock en origen).');
    }

    public function recibir(Transferencia $transferencia, TransferenciaStockService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertModule();
        $service->recibir($transferencia);

        return back()->with('success', 'Transferencia recibida (entrada de stock en destino).');
    }

    public function anular(Transferencia $transferencia, TransferenciaStockService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertModule();
        $service->anular($transferencia);

        return back()->with('success', 'Transferencia anulada.');
    }

    public function itemsSede(Request $request): Response|\Illuminate\Http\JsonResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = (string) $request->string('sede_id');

        return response()->json($this->itemsForSede($sedeId));
    }

    private function assertModule(): void
    {
        $tenant = app(TenantManager::class)->current()?->tenant;
        if (! PlanCapabilities::multiAlmacen($tenant) && ! PlanCapabilities::franquiciaConsolidado($tenant)) {
            // Permitir a tenants con multi-sede aunque el feature aún no esté en plan seedado.
            // Gate blando: si tiene más de 1 sede, deja pasar.
            if (Sede::query()->where('activa', true)->count() < 2) {
                abort(403, 'Activa multi-sede / multi-almacén en el plan.');
            }
        }
    }

    /** @return list<array{id: string, nombre: string}> */
    private function sedesOptions(): array
    {
        return Sede::query()
            ->where('activa', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre'])
            ->map(fn (Sede $s) => ['id' => $s->id, 'nombre' => $s->nombre])
            ->all();
    }

    /**
     * @return array{insumos: list<array{id: string, nombre: string, unidad: string, stock: float}>, productos: list<array{id: string, nombre: string, stock: float}>}
     */
    private function itemsForSede(string $sedeId): array
    {
        return [
            'insumos' => Insumo::query()
                ->where('sede_id', $sedeId)
                ->where('activo', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'unidad', 'stock'])
                ->map(fn (Insumo $i) => [
                    'id' => $i->id,
                    'nombre' => $i->nombre,
                    'unidad' => $i->unidad,
                    'stock' => (float) $i->stock,
                ])->all(),
            'productos' => ProductoCarta::query()
                ->where('sede_id', $sedeId)
                ->where('control_inventario', ProductoCarta::CONTROL_SKU)
                ->where('activo', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'stock'])
                ->map(fn (ProductoCarta $p) => [
                    'id' => $p->id,
                    'nombre' => $p->nombre,
                    'stock' => (float) $p->stock,
                ])->all(),
        ];
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\RequerimientoAbastecimiento;
use App\Models\RequerimientoLinea;
use App\Models\Sede;
use App\Services\Inventario\RequerimientoAbastecimientoService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AbastecimientoController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';
        $estado = (string) $request->string('estado', 'todos');

        $query = RequerimientoAbastecimiento::query()
            ->with(['sedeSolicitante:id,nombre', 'sedeAbastecedora:id,nombre'])
            ->withCount('lineas')
            ->orderByDesc('numero');

        if ($sedeId !== '') {
            $query->where(function ($q) use ($sedeId): void {
                $q->where('sede_solicitante_id', $sedeId)
                    ->orWhere('sede_abastecedora_id', $sedeId);
            });
        }

        if ($estado !== 'todos' && in_array($estado, RequerimientoAbastecimiento::ESTADOS, true)) {
            $query->where('estado', $estado);
        }

        $rows = $query->paginate(15)->withQueryString()->through(fn (RequerimientoAbastecimiento $r) => [
            'id' => $r->id,
            'numero' => $r->numero,
            'estado' => $r->estado,
            'prioridad' => $r->prioridad,
            'solicitante' => $r->sedeSolicitante?->nombre,
            'abastecedora' => $r->sedeAbastecedora?->nombre,
            'lineas_count' => $r->lineas_count,
            'fecha_necesaria' => $r->fecha_necesaria?->format('Y-m-d'),
        ]);

        return Inertia::render('abastecimiento/index', [
            'requerimientos' => $rows,
            'filters' => ['estado' => $estado],
            'stats' => [
                'total' => RequerimientoAbastecimiento::query()->count(),
                'pendientes' => RequerimientoAbastecimiento::query()
                    ->whereIn('estado', [
                        RequerimientoAbastecimiento::ESTADO_SOLICITADO,
                        RequerimientoAbastecimiento::ESTADO_APROBADO,
                    ])->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        return Inertia::render('abastecimiento/form', [
            'sedes' => Sede::query()->where('activa', true)->orderBy('nombre')->get(['id', 'nombre']),
            'default_solicitante_id' => $sedeId,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $data = $request->validate([
            'sede_solicitante_id' => ['required', 'uuid', Rule::exists('sedes', 'id')],
            'sede_abastecedora_id' => ['required', 'uuid', 'different:sede_solicitante_id', Rule::exists('sedes', 'id')],
            'prioridad' => ['nullable', Rule::in(['baja', 'normal', 'alta'])],
            'fecha_necesaria' => ['nullable', 'date'],
            'notas' => ['nullable', 'string', 'max:500'],
            'lineas' => ['required', 'array', 'min:1'],
            'lineas.*.linea_tipo' => ['required', Rule::in(['insumo', 'producto'])],
            'lineas.*.nombre' => ['required', 'string', 'max:180'],
            'lineas.*.cantidad' => ['required', 'numeric', 'gt:0'],
            'lineas.*.unidad' => ['nullable', 'string', 'max:20'],
        ]);

        $numero = ((int) RequerimientoAbastecimiento::query()
            ->where('sede_solicitante_id', $data['sede_solicitante_id'])
            ->max('numero')) + 1;

        $req = RequerimientoAbastecimiento::query()->create([
            'sede_solicitante_id' => $data['sede_solicitante_id'],
            'sede_abastecedora_id' => $data['sede_abastecedora_id'],
            'numero' => $numero,
            'estado' => RequerimientoAbastecimiento::ESTADO_BORRADOR,
            'prioridad' => $data['prioridad'] ?? 'normal',
            'fecha_necesaria' => $data['fecha_necesaria'] ?? null,
            'notas' => $data['notas'] ?? null,
            'user_id' => Auth::id(),
        ]);

        foreach ($data['lineas'] as $linea) {
            RequerimientoLinea::query()->create([
                'requerimiento_id' => $req->id,
                'linea_tipo' => $linea['linea_tipo'],
                'nombre' => trim($linea['nombre']),
                'cantidad' => $linea['cantidad'],
                'unidad' => $linea['unidad'] ?? 'und',
            ]);
        }

        return redirect()
            ->route('abastecimiento.show', $req)
            ->with('success', 'Requerimiento #'.$req->numero.' creado.');
    }

    public function show(RequerimientoAbastecimiento $requerimiento): Response
    {
        $this->tenantIdOrAbort();
        $requerimiento->load(['sedeSolicitante:id,nombre', 'sedeAbastecedora:id,nombre', 'lineas', 'transferencia:id,numero,estado']);

        return Inertia::render('abastecimiento/show', [
            'requerimiento' => [
                'id' => $requerimiento->id,
                'numero' => $requerimiento->numero,
                'estado' => $requerimiento->estado,
                'prioridad' => $requerimiento->prioridad,
                'notas' => $requerimiento->notas,
                'fecha_necesaria' => $requerimiento->fecha_necesaria?->format('Y-m-d'),
                'solicitante' => $requerimiento->sedeSolicitante?->nombre,
                'abastecedora' => $requerimiento->sedeAbastecedora?->nombre,
                'transferencia' => $requerimiento->transferencia
                    ? [
                        'id' => $requerimiento->transferencia->id,
                        'numero' => $requerimiento->transferencia->numero,
                        'estado' => $requerimiento->transferencia->estado,
                    ]
                    : null,
                'lineas' => $requerimiento->lineas->map(fn (RequerimientoLinea $l) => [
                    'id' => $l->id,
                    'tipo' => $l->linea_tipo,
                    'nombre' => $l->nombre,
                    'cantidad' => (float) $l->cantidad,
                    'unidad' => $l->unidad,
                ]),
            ],
        ]);
    }

    public function solicitar(RequerimientoAbastecimiento $requerimiento, RequerimientoAbastecimientoService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $service->solicitar($requerimiento);

        return back()->with('success', 'Requerimiento enviado a la sede abastecedora.');
    }

    public function aprobar(RequerimientoAbastecimiento $requerimiento, RequerimientoAbastecimientoService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $service->aprobar($requerimiento);

        return back()->with('success', 'Requerimiento aprobado.');
    }

    public function rechazar(RequerimientoAbastecimiento $requerimiento, RequerimientoAbastecimientoService $service): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $service->rechazar($requerimiento);

        return back()->with('success', 'Requerimiento rechazado.');
    }

    public function generarTransferencia(
        RequerimientoAbastecimiento $requerimiento,
        RequerimientoAbastecimientoService $service,
    ): RedirectResponse {
        $this->tenantIdOrAbort();
        $tf = $service->generarTransferencia($requerimiento);

        return redirect()
            ->route('transferencias.show', $tf)
            ->with('success', 'Transferencia #'.$tf->numero.' generada desde el requerimiento.');
    }
}

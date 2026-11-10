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

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';

        $parseDate = static function (string $value): string {
            $value = trim($value);

            return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 ? $value : '';
        };

        $fecha = $parseDate((string) $request->string('fecha', now()->toDateString()));
        if ($fecha === '') {
            $fecha = now()->toDateString();
        }

        $estado = (string) $request->string('estado', 'todas');
        if ($estado !== 'todas' && ! in_array($estado, Reserva::ESTADOS, true)) {
            $estado = 'todas';
        }

        $query = Reserva::query()
            ->with(['mesa:id,codigo,nombre', 'createdBy:id,name'])
            ->orderBy('reserved_at');

        if ($sedeId !== '') {
            $query->where('sede_id', $sedeId);
        } else {
            $query->whereRaw('1 = 0');
        }

        $query->whereDate('reserved_at', $fecha);

        if ($estado !== 'todas') {
            $query->where('estado', $estado);
        }

        $mesas = $sedeId !== ''
            ? Mesa::query()
                ->where('sede_id', $sedeId)
                ->where('activa', true)
                ->orderBy('codigo')
                ->get(['id', 'codigo', 'nombre', 'capacidad'])
            : collect();

        return Inertia::render('reservas/index', [
            'reservas' => $query->get()->map(fn (Reserva $r) => [
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
            ]),
            'mesas' => $mesas,
            'filters' => [
                'fecha' => $fecha,
                'estado' => $estado,
            ],
            'estados' => Reserva::ESTADOS,
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
        $sedeId = (string) $reserva->sede_id;
        $data = $this->validated($request, $sedeId, true);

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
}

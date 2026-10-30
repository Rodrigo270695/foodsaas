<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Http\Requests\MesaRequest;
use App\Http\Requests\ZonaRequest;
use App\Models\Mesa;
use App\Models\Sede;
use App\Models\Zona;
use App\Support\Plan\PlanLimits;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SalonController extends Controller
{
    use ResolvesTenantId;

    public function index(Request $request): Response
    {
        $tenantId = $this->tenantIdOrAbort();

        $sedes = Sede::query()
            ->where('tenant_id', $tenantId)
            ->where('activa', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'codigo']);

        $sedeIds = $sedes->pluck('id')->map(fn ($id) => (string) $id)->all();
        $sedeRequested = (string) $request->string('sede_id', '');
        $sedeId = in_array($sedeRequested, $sedeIds, true)
            ? $sedeRequested
            : (string) ($sedes->first()?->id ?? '');

        $zonas = $sedeId === ''
            ? collect()
            : Zona::query()
                ->where('sede_id', $sedeId)
                ->withCount('mesas')
                ->orderBy('orden')
                ->orderBy('nombre')
                ->get();

        $zonaId = (string) $request->string('zona_id', '');
        if ($zonaId !== '' && ! $zonas->contains('id', $zonaId)) {
            $zonaId = '';
        }

        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, ['todos', 'activas', 'inactivas'], true)) {
            $estado = 'todos';
        }

        $mesasQuery = Mesa::query()
            ->with(['zona:id,nombre'])
            ->orderBy('codigo');

        if ($sedeId !== '') {
            $mesasQuery->where('sede_id', $sedeId);
        } else {
            $mesasQuery->whereRaw('1 = 0');
        }

        if ($zonaId !== '') {
            $mesasQuery->where('zona_id', $zonaId);
        }

        if ($estado === 'activas') {
            $mesasQuery->where('activa', true);
        } elseif ($estado === 'inactivas') {
            $mesasQuery->where('activa', false);
        }

        $mesas = $mesasQuery->get();

        return Inertia::render('salon/index', [
            'sedes_opciones' => $sedes,
            'zonas' => $zonas,
            'mesas' => $mesas,
            'filters' => [
                'sede_id' => $sedeId !== '' ? $sedeId : null,
                'zona_id' => $zonaId !== '' ? $zonaId : null,
                'estado' => $estado,
            ],
            'stats' => [
                'zonas' => $zonas->count(),
                'mesas' => $mesas->count(),
                'mesas_activas' => $mesas->where('activa', true)->count(),
                'capacidad' => $mesas->where('activa', true)->sum('capacidad'),
            ],
            'plan_mesas_reached' => PlanLimits::isReached('max_mesas'),
        ]);
    }

    public function storeZona(ZonaRequest $request): RedirectResponse
    {
        $this->tenantIdOrAbort();

        Zona::query()->create($request->validated());

        return back()->with('success', 'Zona creada correctamente.');
    }

    public function updateZona(ZonaRequest $request, Zona $zona): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertZonaTenant($zona);

        $zona->update($request->validated());

        return back()->with('success', 'Zona actualizada correctamente.');
    }

    public function destroyZona(Zona $zona): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertZonaTenant($zona);

        if ($zona->mesas()->exists()) {
            throw ValidationException::withMessages([
                'zona' => 'No se puede eliminar una zona con mesas. Muévelas o elimínalas primero.',
            ]);
        }

        $zona->delete();

        return back()->with('success', 'Zona eliminada correctamente.');
    }

    public function storeMesa(MesaRequest $request): RedirectResponse
    {
        $tenantId = $this->tenantIdOrAbort();
        $data = $request->validated();

        $existe = Mesa::query()
            ->where('sede_id', $data['sede_id'])
            ->where('codigo', $data['codigo'])
            ->exists();

        if ($existe) {
            throw ValidationException::withMessages([
                'codigo' => 'Ya existe una mesa con ese código en la sede.',
            ]);
        }

        $this->assertSedeTenant($data['sede_id'], $tenantId);

        Mesa::query()->create($data);

        return back()->with('success', 'Mesa creada correctamente.');
    }

    public function updateMesa(MesaRequest $request, Mesa $mesa): RedirectResponse
    {
        $tenantId = $this->tenantIdOrAbort();
        $this->assertMesaTenant($mesa);
        $data = $request->validated();

        $existe = Mesa::query()
            ->where('sede_id', $data['sede_id'])
            ->where('codigo', $data['codigo'])
            ->whereKeyNot($mesa->id)
            ->exists();

        if ($existe) {
            throw ValidationException::withMessages([
                'codigo' => 'Ya existe una mesa con ese código en la sede.',
            ]);
        }

        $this->assertSedeTenant($data['sede_id'], $tenantId);
        $mesa->update($data);

        return back()->with('success', 'Mesa actualizada correctamente.');
    }

    public function destroyMesa(Mesa $mesa): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertMesaTenant($mesa);
        $mesa->delete();

        return back()->with('success', 'Mesa eliminada correctamente.');
    }

    private function assertSedeTenant(string $sedeId, string $tenantId): void
    {
        $ok = Sede::query()
            ->whereKey($sedeId)
            ->where('tenant_id', $tenantId)
            ->exists();

        if (! $ok) {
            throw ValidationException::withMessages([
                'sede_id' => 'La sede no pertenece a este restaurante.',
            ]);
        }
    }

    private function assertZonaTenant(Zona $zona): void
    {
        $tenantId = $this->tenantIdOrAbort();
        $ok = Sede::query()
            ->whereKey($zona->sede_id)
            ->where('tenant_id', $tenantId)
            ->exists();

        if (! $ok) {
            abort(404);
        }
    }

    private function assertMesaTenant(Mesa $mesa): void
    {
        $tenantId = $this->tenantIdOrAbort();
        $ok = Sede::query()
            ->whereKey($mesa->sede_id)
            ->where('tenant_id', $tenantId)
            ->exists();

        if (! $ok) {
            abort(404);
        }
    }
}

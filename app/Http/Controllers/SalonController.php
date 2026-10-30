<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Http\Requests\MesaRequest;
use App\Http\Requests\ZonaRequest;
use App\Models\Mesa;
use App\Models\Sede;
use App\Models\Zona;
use App\Services\Sedes\CopySalonToSedeService;
use App\Support\Plan\PlanLimits;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SalonController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $sedes = collect(ActiveSedeContext::accessibleCatalog());

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
            'copy_targets' => array_values(array_filter(
                $sedes->all(),
                static fn (array $s): bool => $s['id'] !== $sedeId,
            )),
        ]);
    }

    public function copyToSede(Request $request, CopySalonToSedeService $copier): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $from = $this->activeSedeIdOrAbort();
        $data = $request->validate([
            'target_sede_id' => ['required', 'uuid'],
        ]);

        $result = $copier->copy($from, (string) $data['target_sede_id']);

        return back()->with(
            'success',
            sprintf(
                'Copia a sede lista: %d zonas, %d mesas nuevas.',
                $result['zonas'],
                $result['mesas'],
            ),
        );
    }

    public function storeZona(ZonaRequest $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        Zona::query()->create([
            ...$request->validated(),
            'sede_id' => $sedeId,
        ]);

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
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();
        $data = $request->validated();
        $data['sede_id'] = $sedeId;

        $existe = Mesa::query()
            ->where('sede_id', $sedeId)
            ->where('codigo', $data['codigo'])
            ->exists();

        if ($existe) {
            throw ValidationException::withMessages([
                'codigo' => 'Ya existe una mesa con ese código en la sede.',
            ]);
        }

        ActiveSedeContext::assertAccessible($sedeId);
        Mesa::query()->create($data);

        return back()->with('success', 'Mesa creada correctamente.');
    }

    public function updateMesa(MesaRequest $request, Mesa $mesa): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertMesaTenant($mesa);
        $data = $request->validated();
        $data['sede_id'] = (string) $mesa->sede_id;

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

        ActiveSedeContext::assertAccessible($data['sede_id']);
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

    /**
     * Une 2+ mesas de la misma sede en un grupo (familia / grupo grande).
     */
    public function unirMesas(Request $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();

        $data = $request->validate([
            'mesa_ids' => ['required', 'array', 'min:2', 'max:8'],
            'mesa_ids.*' => ['required', 'uuid'],
        ]);

        /** @var list<string> $ids */
        $ids = array_values(array_unique($data['mesa_ids']));

        $mesas = Mesa::query()
            ->where('sede_id', $sedeId)
            ->whereIn('id', $ids)
            ->get();

        if ($mesas->count() !== count($ids)) {
            throw ValidationException::withMessages([
                'mesa_ids' => 'Alguna mesa no pertenece a la sede activa.',
            ]);
        }

        if ($mesas->contains(fn (Mesa $m): bool => ! $m->activa)) {
            throw ValidationException::withMessages([
                'mesa_ids' => 'Solo se pueden unir mesas activas / disponibles.',
            ]);
        }

        $existingUnions = $mesas
            ->pluck('union_id')
            ->filter(fn ($id) => is_string($id) && $id !== '')
            ->unique()
            ->values();

        // Toda la unión (incl. miembros ya agrupados) debe ser de la misma zona.
        $zonaScope = Mesa::query()
            ->where('sede_id', $sedeId)
            ->where(function ($q) use ($ids, $existingUnions): void {
                $q->whereIn('id', $ids);
                if ($existingUnions->isNotEmpty()) {
                    $q->orWhereIn('union_id', $existingUnions->all());
                }
            })
            ->pluck('zona_id')
            ->unique()
            ->values();

        if ($zonaScope->count() !== 1) {
            throw ValidationException::withMessages([
                'mesa_ids' => 'Solo se pueden unir mesas de la misma zona.',
            ]);
        }

        $unionId = $existingUnions->count() === 1
            ? (string) $existingUnions->first()
            : (string) Str::uuid();

        // Si había varios grupos distintos, absorbemos todos los miembros.
        if ($existingUnions->count() > 1) {
            Mesa::query()
                ->where('sede_id', $sedeId)
                ->whereIn('union_id', $existingUnions->all())
                ->update(['union_id' => $unionId]);
        }

        Mesa::query()
            ->whereIn('id', $ids)
            ->update(['union_id' => $unionId]);

        $cap = (int) Mesa::query()->where('union_id', $unionId)->sum('capacidad');

        return back()->with(
            'success',
            sprintf('Mesas unidas · capacidad conjunta %d personas.', $cap),
        );
    }

    /**
     * Saca una mesa del grupo (o disuelve el grupo si quedan < 2).
     */
    public function separarMesa(Mesa $mesa): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertMesaTenant($mesa);

        $unionId = $mesa->union_id;
        if (! is_string($unionId) || $unionId === '') {
            return back()->with('success', 'La mesa ya estaba separada.');
        }

        $mesa->update(['union_id' => null]);

        $restantes = Mesa::query()->where('union_id', $unionId)->count();
        if ($restantes < 2) {
            Mesa::query()->where('union_id', $unionId)->update(['union_id' => null]);
        }

        return back()->with('success', 'Mesa separada del grupo.');
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

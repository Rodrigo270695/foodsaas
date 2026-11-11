<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\Proveedor;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProveedorController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50];

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';

        $search = trim((string) $request->string('search', ''));
        $estado = (string) $request->string('estado', 'activos');
        if (! in_array($estado, ['activos', 'inactivos', 'todos'], true)) {
            $estado = 'activos';
        }

        $perPage = (int) $request->integer('per_page', 15);
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 15;
        }

        $query = Proveedor::query()->orderBy('nombre');

        if ($sedeId !== '') {
            $query->where(function ($q) use ($sedeId): void {
                $q->whereNull('sede_id')->orWhere('sede_id', $sedeId);
            });
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($estado === 'activos') {
            $query->where('activo', true);
        } elseif ($estado === 'inactivos') {
            $query->where('activo', false);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('nombre', 'ilike', "%{$search}%")
                    ->orWhere('ruc', 'ilike', "%{$search}%")
                    ->orWhere('telefono', 'ilike', "%{$search}%");
            });
        }

        $proveedores = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Proveedor $p) => $this->serialize($p));

        $base = Proveedor::query()->when(
            $sedeId !== '',
            fn ($q) => $q->where(fn ($qq) => $qq->whereNull('sede_id')->orWhere('sede_id', $sedeId)),
            fn ($q) => $q->whereRaw('1 = 0'),
        );

        return Inertia::render('proveedores/index', [
            'proveedores' => $proveedores,
            'filters' => [
                'search' => $search,
                'estado' => $estado,
                'per_page' => $perPage,
                'sort' => null,
                'direction' => null,
            ],
            'stats' => [
                'total' => (clone $base)->count(),
                'activos' => (clone $base)->where('activo', true)->count(),
                'coincidencias' => $proveedores->total(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = $this->activeSedeIdOrAbort();
        $data = $this->validated($request);

        Proveedor::query()->create([
            ...$data,
            'sede_id' => $sedeId,
        ]);

        return back()->with('success', 'Proveedor creado.');
    }

    public function update(Request $request, Proveedor $proveedor): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertAccessible($proveedor);

        $proveedor->update($this->validated($request));

        return back()->with('success', 'Proveedor actualizado.');
    }

    public function destroy(Proveedor $proveedor): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $this->assertAccessible($proveedor);

        if ($proveedor->compras()->exists()) {
            return back()->with('error', 'No se puede eliminar: el proveedor tiene compras.');
        }

        $proveedor->delete();

        return back()->with('success', 'Proveedor eliminado.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:180'],
            'ruc' => ['nullable', 'string', 'max:11'],
            'telefono' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:180'],
            'notas' => ['nullable', 'string', 'max:500'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $ruc = isset($data['ruc']) ? preg_replace('/\D+/', '', (string) $data['ruc']) : '';

        return [
            'nombre' => trim((string) $data['nombre']),
            'ruc' => $ruc !== '' ? $ruc : null,
            'telefono' => isset($data['telefono']) && trim((string) $data['telefono']) !== ''
                ? trim((string) $data['telefono'])
                : null,
            'email' => isset($data['email']) && trim((string) $data['email']) !== ''
                ? trim((string) $data['email'])
                : null,
            'notas' => isset($data['notas']) && trim((string) $data['notas']) !== ''
                ? trim((string) $data['notas'])
                : null,
            'activo' => array_key_exists('activo', $data) ? (bool) $data['activo'] : true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Proveedor $p): array
    {
        return [
            'id' => $p->id,
            'nombre' => $p->nombre,
            'ruc' => $p->ruc,
            'telefono' => $p->telefono,
            'email' => $p->email,
            'notas' => $p->notas,
            'activo' => $p->activo,
        ];
    }

    private function assertAccessible(Proveedor $proveedor): void
    {
        $sedeId = ActiveSedeContext::id();
        if ($sedeId === null) {
            abort(404);
        }
        if ($proveedor->sede_id !== null && $proveedor->sede_id !== $sedeId) {
            abort(404);
        }
    }
}

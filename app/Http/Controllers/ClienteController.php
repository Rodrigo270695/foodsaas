<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Models\Cliente;
use App\Models\Venta;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ClienteController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;

    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50];

    public function index(Request $request): Response
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id() ?? '';
        $search = trim((string) $request->string('search', ''));
        $perPage = (int) $request->integer('per_page', 15);
        if (! in_array($perPage, self::PER_PAGE_OPTIONS, true)) {
            $perPage = 15;
        }

        $query = Cliente::query()->orderBy('nombre');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('nombre', 'ilike', "%{$search}%")
                    ->orWhere('documento', 'ilike', "%{$search}%")
                    ->orWhere('telefono', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $total = Cliente::query()->count();
        $conDocumento = Cliente::query()->whereNotNull('documento')->where('documento', '!=', '')->count();

        $clientes = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (Cliente $cliente) use ($sedeId): array {
                $ventasQuery = Venta::query()
                    ->where('cliente_documento', $cliente->documento)
                    ->where('estado', Venta::ESTADO_PAGADA);

                if ($sedeId !== '' && $cliente->documento) {
                    $ventasQuery->where('sede_id', $sedeId);
                }

                $totalCompras = $cliente->documento
                    ? (float) (clone $ventasQuery)->sum('total')
                    : 0.0;
                $ultima = $cliente->documento
                    ? (clone $ventasQuery)->latest('created_at')->value('created_at')
                    : null;

                return [
                    'id' => $cliente->id,
                    'nombre' => $cliente->nombre,
                    'documento' => $cliente->documento,
                    'telefono' => $cliente->telefono,
                    'email' => $cliente->email,
                    'notas' => $cliente->notas,
                    'total_compras' => round($totalCompras, 2),
                    'ultima_venta' => $ultima?->toIso8601String(),
                ];
            });

        return Inertia::render('clientes/index', [
            'clientes' => $clientes,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
                'sort' => null,
                'direction' => null,
            ],
            'stats' => [
                'total' => $total,
                'con_documento' => $conDocumento,
                'filtros' => $search !== '' ? 1 : 0,
                'coincidencias' => $clientes->total(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $sedeId = ActiveSedeContext::id();

        $data = $this->validated($request);
        $data['sede_id'] = $sedeId;

        Cliente::query()->create($data);

        return back()->with('success', 'Cliente registrado.');
    }

    public function update(Request $request, Cliente $cliente): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $cliente->update($this->validated($request, $cliente->id));

        return back()->with('success', 'Cliente actualizado.');
    }

    public function destroy(Cliente $cliente): RedirectResponse
    {
        $this->tenantIdOrAbort();
        $cliente->delete();

        return back()->with('success', 'Cliente eliminado.');
    }

    /**
     * @return array{nombre: string, documento: ?string, telefono: ?string, email: ?string, notas: ?string}
     */
    private function validated(Request $request, ?string $ignoreId = null): array
    {
        $request->merge([
            'documento' => $request->filled('documento') ? trim((string) $request->input('documento')) : null,
            'telefono' => $request->filled('telefono') ? trim((string) $request->input('telefono')) : null,
            'email' => $request->filled('email') ? trim((string) $request->input('email')) : null,
            'notas' => $request->filled('notas') ? trim((string) $request->input('notas')) : null,
        ]);

        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:180'],
            'documento' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('crm_clientes', 'documento')->ignore($ignoreId),
            ],
            'telefono' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:180'],
            'notas' => ['nullable', 'string', 'max:2000'],
        ]);

        return [
            'nombre' => trim((string) $data['nombre']),
            'documento' => $data['documento'] ?? null,
            'telefono' => $data['telefono'] ?? null,
            'email' => $data['email'] ?? null,
            'notas' => $data['notas'] ?? null,
        ];
    }
}

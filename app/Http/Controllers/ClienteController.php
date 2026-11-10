<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Http\Controllers\Concerns\RespondsToApiPeruConsulta;
use App\Models\Cliente;
use App\Models\Venta;
use App\Services\Integrations\ApiPeruDniService;
use App\Support\Sedes\ActiveSedeContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ClienteController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;
    use RespondsToApiPeruConsulta;

    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50];

    private const DOCUMENT_TIPOS = ['DNI', 'CE', 'PAS', 'OTRO'];

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
                    'documento_tipo' => $cliente->documento_tipo,
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

    /**
     * Consulta DNI (RENIEC vía APIPerú) para autocompletar el nombre del cliente.
     */
    public function consultaDni(Request $request, ApiPeruDniService $apiPeru): JsonResponse
    {
        $this->tenantIdOrAbort();

        abort_unless(
            $request->user()?->can('clientes.create')
            || $request->user()?->can('clientes.update'),
            403,
        );

        $dni = preg_replace('/\D+/', '', (string) $request->query('dni', '')) ?? '';
        $request->merge(['dni' => $dni]);

        $validated = $request->validate([
            'dni' => ['required', 'string', 'regex:/^[0-9]{8}$/'],
        ]);

        return $this->consultaApiPeruResponse(
            fn () => $apiPeru->consultar($validated['dni']),
        );
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
     * @return array{nombre: string, documento_tipo: ?string, documento: ?string, telefono: ?string, email: ?string, notas: ?string}
     */
    private function validated(Request $request, ?string $ignoreId = null): array
    {
        $request->merge([
            'documento_tipo' => $request->filled('documento_tipo')
                ? strtoupper(trim((string) $request->input('documento_tipo')))
                : null,
            'documento' => $request->filled('documento') ? trim((string) $request->input('documento')) : null,
            'telefono' => $request->filled('telefono') ? trim((string) $request->input('telefono')) : null,
            'email' => $request->filled('email') ? trim((string) $request->input('email')) : null,
            'notas' => $request->filled('notas') ? trim((string) $request->input('notas')) : null,
        ]);

        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:180'],
            'documento_tipo' => ['nullable', 'string', Rule::in(self::DOCUMENT_TIPOS)],
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

        $tipo = $data['documento_tipo'] ?? null;
        $doc = $data['documento'] ?? null;
        if ($doc === null) {
            $tipo = null;
        }

        return [
            'nombre' => trim((string) $data['nombre']),
            'documento_tipo' => $tipo,
            'documento' => $doc,
            'telefono' => $data['telefono'] ?? null,
            'email' => $data['email'] ?? null,
            'notas' => $data['notas'] ?? null,
        ];
    }
}

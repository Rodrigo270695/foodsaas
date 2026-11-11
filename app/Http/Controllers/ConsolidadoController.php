<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Services\Inventario\ConsolidadoStockService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConsolidadoController extends Controller
{
    use ResolvesTenantId;

    public function index(Request $request, ConsolidadoStockService $service): Response
    {
        $this->tenantIdOrAbort();
        $q = trim((string) $request->string('search', ''));
        $items = $service->consolidar($q !== '' ? $q : null);

        $bajoMinimo = collect($items)->where('bajo_minimo', true)->count();

        return Inertia::render('consolidado/index', [
            'items' => $items,
            'filters' => ['search' => $q],
            'stats' => [
                'skus' => count($items),
                'bajo_minimo' => $bajoMinimo,
                'sedes' => collect($items)->flatMap(fn ($i) => collect($i['sedes'])->pluck('sede_id'))->unique()->filter()->count(),
            ],
        ]);
    }
}

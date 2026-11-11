<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Sede;
use App\Models\Subscription;
use App\Models\Tenant;
use Inertia\Inertia;
use Inertia\Response;

class PlataformaReportesController extends Controller
{
    public function index(): Response
    {
        $porPlan = Plan::query()
            ->with('features')
            ->withCount(['subscriptions as activas_count' => fn ($q) => $q->whereIn('estado', ['active', 'trial', 'grace'])])
            ->orderBy('orden')
            ->get()
            ->map(function (Plan $p) {
                $activas = (int) $p->activas_count;
                $precio = (float) $p->precio_mensual;

                return [
                    'codigo' => $p->codigo,
                    'nombre' => $p->nombre,
                    'precio' => $precio,
                    'activas' => $activas,
                    'mrr' => round($activas * $precio, 2),
                    'features_on' => collect(Plan::FEATURE_CATALOG)
                        ->filter(fn ($meta) => ($meta['type'] ?? '') === 'bool')
                        ->keys()
                        ->filter(fn (string $key) => (bool) $p->resolveFeature($key))
                        ->values()
                        ->all(),
                ];
            });

        $porEstado = Tenant::query()
            ->selectRaw('estado, count(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        $mrr = $porPlan->sum('mrr');
        $subsVivas = Subscription::query()->whereIn('estado', ['active', 'trial', 'grace'])->count();

        return Inertia::render('plataforma/reportes/index', [
            'por_plan' => $porPlan->values(),
            'por_estado' => $porEstado,
            'totales' => [
                'tenants' => Tenant::query()->count(),
                'subs' => Subscription::query()->count(),
                'subs_vivas' => $subsVivas,
                'sedes' => Sede::query()->count(),
                'mrr' => $mrr,
            ],
            'feature_labels' => [
                'modulo_delivery' => 'Delivery',
                'modulo_reservas' => 'Reservas',
                'modulo_reportes' => 'Reportes',
                'modulo_recetas' => 'Recetas',
                'modulo_compras' => 'Compras',
                'modulo_ofertas' => 'Ofertas',
                'modulo_whatsapp' => 'WhatsApp',
                'multi_almacen' => 'Multi-almacén',
                'franquicia_consolidado' => 'Consolidado',
                'abastecimiento_central' => 'Abastecimiento',
                'integraciones_delivery' => 'Apps delivery',
                'boletas_electronicas' => 'Boletas',
                'facturas_electronicas' => 'Facturas',
                'guias_remision' => 'Guías',
                'notas_credito' => 'NC',
                'notas_debito' => 'ND',
            ],
        ]);
    }

    public function mapa(): Response
    {
        $puntos = Tenant::query()
            ->with('distritoModel:id,nombre,provincia_id')
            ->where('estado', 'active')
            ->orderBy('razon_social')
            ->get(['id', 'razon_social', 'nombre_comercial', 'slug', 'distrito_id', 'direccion'])
            ->map(fn (Tenant $t) => [
                'id' => $t->id,
                'nombre' => $t->nombre_comercial ?: $t->razon_social,
                'slug' => $t->slug,
                'distrito' => $t->distritoModel?->nombre,
                'direccion' => $t->direccion,
            ]);

        return Inertia::render('plataforma/reportes/mapa', [
            'puntos' => $puntos,
        ]);
    }
}

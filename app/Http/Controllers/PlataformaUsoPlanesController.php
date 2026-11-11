<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Subscription;
use App\Support\Plan\PlanLimits;
use Inertia\Inertia;
use Inertia\Response;

class PlataformaUsoPlanesController extends Controller
{
    /** @var list<string> */
    private const USAGE_KEYS = ['max_sedes', 'max_usuarios'];

    /** @var list<string> */
    private const LIMIT_KEYS = [
        'max_sedes',
        'max_usuarios',
        'max_productos',
        'max_mesas',
        'max_pedidos_mes',
        'max_comprobantes_mes',
    ];

    /** @var list<string> */
    private const BOOL_KEYS = [
        'modulo_delivery',
        'modulo_reservas',
        'modulo_reportes',
        'modulo_recetas',
        'modulo_compras',
        'modulo_ofertas',
        'modulo_whatsapp',
        'multi_almacen',
        'franquicia_consolidado',
        'abastecimiento_central',
        'integraciones_delivery',
        'boletas_electronicas',
        'facturas_electronicas',
        'guias_remision',
        'notas_credito',
        'notas_debito',
    ];

    public function index(): Response
    {
        $rows = Subscription::query()
            ->with([
                'tenant:id,razon_social,nombre_comercial,slug,estado,limites_overrides',
                'plan.features',
            ])
            ->whereIn('estado', ['active', 'trial', 'grace'])
            ->orderByDesc('updated_at')
            ->limit(100)
            ->get()
            ->map(function (Subscription $s) {
                $tenant = $s->tenant;
                $plan = $s->plan;
                $limites = [];

                foreach (self::LIMIT_KEYS as $key) {
                    $max = $tenant && $plan
                        ? PlanLimits::intLimit($tenant, $key)
                        : ($plan ? (is_numeric($plan->resolveFeature($key)) ? (int) $plan->resolveFeature($key) : null) : null);

                    if ($max !== null && $max < 0) {
                        $max = null;
                    }

                    $usado = null;
                    if ($tenant && in_array($key, self::USAGE_KEYS, true)) {
                        $usado = PlanLimits::currentCount($key, $tenant);
                    }

                    $limites[$key] = [
                        'usado' => $usado,
                        'max' => $max,
                    ];
                }

                $features = [];
                if ($plan) {
                    foreach (self::BOOL_KEYS as $key) {
                        $features[$key] = (bool) $plan->resolveFeature($key);
                    }
                }

                return [
                    'id' => $s->id,
                    'tenant' => $tenant?->nombre_comercial ?: $tenant?->razon_social,
                    'slug' => $tenant?->slug,
                    'plan' => $plan?->nombre,
                    'plan_codigo' => $plan?->codigo,
                    'estado' => $s->estado,
                    'limites' => $limites,
                    'features' => $features,
                    'features_on_count' => collect($features)->filter()->count(),
                ];
            });

        return Inertia::render('plataforma/uso-planes/index', [
            'rows' => $rows,
            'planes' => Plan::query()->orderBy('orden')->get(['id', 'codigo', 'nombre']),
            'feature_labels' => [
                'max_sedes' => 'Sedes',
                'max_usuarios' => 'Usuarios',
                'max_productos' => 'Productos',
                'max_mesas' => 'Mesas',
                'max_pedidos_mes' => 'Pedidos/mes',
                'max_comprobantes_mes' => 'CPE/mes',
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
}

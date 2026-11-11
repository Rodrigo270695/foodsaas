<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Subscription;
use App\Support\Plan\PlanLimits;
use Inertia\Inertia;
use Inertia\Response;

class PlataformaUsoPlanesController extends Controller
{
    public function index(): Response
    {
        $rows = Subscription::query()
            ->with(['tenant:id,razon_social,nombre_comercial,slug,estado,limites_overrides', 'plan'])
            ->whereIn('estado', ['active', 'trial', 'grace'])
            ->orderByDesc('updated_at')
            ->limit(100)
            ->get()
            ->map(function (Subscription $s) {
                $tenant = $s->tenant;
                $limites = [];
                if ($tenant) {
                    foreach (['max_sedes', 'max_usuarios'] as $key) {
                        $limites[$key] = [
                            'usado' => PlanLimits::currentCount($key, $tenant),
                            'max' => PlanLimits::intLimit($tenant, $key),
                        ];
                    }
                }

                return [
                    'id' => $s->id,
                    'tenant' => $tenant?->nombre_comercial ?: $tenant?->razon_social,
                    'slug' => $tenant?->slug,
                    'plan' => $s->plan?->nombre,
                    'estado' => $s->estado,
                    'limites' => $limites,
                ];
            });

        return Inertia::render('plataforma/uso-planes/index', [
            'rows' => $rows,
            'planes' => Plan::query()->orderBy('orden')->get(['id', 'codigo', 'nombre']),
        ]);
    }
}

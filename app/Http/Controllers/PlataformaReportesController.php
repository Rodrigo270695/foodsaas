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
            ->withCount(['subscriptions as activas_count' => fn ($q) => $q->whereIn('estado', ['active', 'trial', 'grace'])])
            ->orderBy('orden')
            ->get(['id', 'codigo', 'nombre', 'precio_mensual'])
            ->map(fn (Plan $p) => [
                'codigo' => $p->codigo,
                'nombre' => $p->nombre,
                'precio' => (float) $p->precio_mensual,
                'activas' => $p->activas_count,
            ]);

        $porEstado = Tenant::query()
            ->selectRaw('estado, count(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        return Inertia::render('plataforma/reportes/index', [
            'por_plan' => $porPlan,
            'por_estado' => $porEstado,
            'totales' => [
                'tenants' => Tenant::query()->count(),
                'subs' => Subscription::query()->count(),
                'sedes' => Sede::query()->count(),
            ],
        ]);
    }

    public function mapa(): Response
    {
        $puntos = Tenant::query()
            ->with('distritoModel:id,nombre,provincia_id')
            ->where('estado', 'activo')
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

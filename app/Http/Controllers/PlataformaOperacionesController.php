<?php

namespace App\Http\Controllers;

use App\Models\Sede;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PlataformaOperacionesController extends Controller
{
    public function index(): Response
    {
        $tenants = Tenant::query()->count();
        $activos = Tenant::query()->where('estado', 'activo')->count();
        $suspendidos = Tenant::query()->where('estado', 'suspendido')->count();
        $subsActivas = Subscription::query()->whereIn('estado', ['active', 'trial', 'grace'])->count();
        $usuarios = User::query()->whereNotNull('tenant_id')->count();
        $sedes = Sede::query()->count();

        $recientes = Tenant::query()
            ->orderByDesc('created_at')
            ->limit(8)
            ->get(['id', 'razon_social', 'nombre_comercial', 'slug', 'estado', 'created_at'])
            ->map(fn (Tenant $t) => [
                'id' => $t->id,
                'nombre' => $t->nombre_comercial ?: $t->razon_social,
                'slug' => $t->slug,
                'estado' => $t->estado,
                'created_at' => $t->created_at?->toIso8601String(),
            ]);

        $sesiones = [];
        try {
            $sesiones = DB::table('sessions')
                ->whereNotNull('user_id')
                ->orderByDesc('last_activity')
                ->limit(20)
                ->get(['id', 'user_id', 'ip_address', 'user_agent', 'last_activity'])
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'user_id' => $s->user_id,
                    'ip' => $s->ip_address,
                    'ua' => mb_substr((string) $s->user_agent, 0, 80),
                    'last_activity' => date('c', (int) $s->last_activity),
                ])
                ->all();
        } catch (\Throwable) {
        }

        $schemas = [];
        try {
            $schemas = DB::select(
                "SELECT nspname AS schema FROM pg_namespace WHERE nspname LIKE 'rest_%' ORDER BY nspname LIMIT 50",
            );
        } catch (\Throwable) {
        }

        return Inertia::render('plataforma/operaciones/index', [
            'stats' => [
                'tenants' => $tenants,
                'activos' => $activos,
                'suspendidos' => $suspendidos,
                'subs_activas' => $subsActivas,
                'usuarios' => $usuarios,
                'sedes' => $sedes,
                'schemas' => count($schemas),
            ],
            'recientes' => $recientes,
            'sesiones' => $sesiones,
            'schemas' => collect($schemas)->pluck('schema')->values(),
        ]);
    }
}

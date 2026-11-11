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
        $activos = Tenant::query()->where('estado', 'active')->count();
        $suspendidos = Tenant::query()->where('estado', 'suspended')->count();
        $trial = Tenant::query()->where('estado', 'trial')->count();
        $subsActivas = Subscription::query()->whereIn('estado', ['active', 'trial', 'grace'])->count();
        $usuarios = User::query()->whereNotNull('tenant_id')->count();
        $sedes = Sede::query()->count();

        $recientes = Tenant::query()
            ->orderByDesc('created_at')
            ->limit(8)
            ->get(['id', 'razon_social', 'nombre_comercial', 'slug', 'estado', 'created_at', 'schema_name'])
            ->map(fn (Tenant $t) => [
                'id' => $t->id,
                'nombre' => $t->nombre_comercial ?: $t->razon_social,
                'slug' => $t->slug,
                'estado' => $t->estado,
                'schema' => $t->schema_name,
                'created_at' => $t->created_at?->toIso8601String(),
            ]);

        $userNames = User::query()
            ->whereIn('id', function ($q): void {
                $q->select('user_id')->from('sessions')->whereNotNull('user_id');
            })
            ->pluck('name', 'id');

        $sesiones = [];
        try {
            $sesiones = DB::table('sessions')
                ->whereNotNull('user_id')
                ->orderByDesc('last_activity')
                ->limit(20)
                ->get(['id', 'user_id', 'ip_address', 'user_agent', 'last_activity'])
                ->map(function ($s) use ($userNames) {
                    $ua = (string) $s->user_agent;

                    return [
                        'id' => $s->id,
                        'user_id' => $s->user_id,
                        'user_name' => $userNames[$s->user_id] ?? ('#'.$s->user_id),
                        'ip' => $s->ip_address,
                        'browser' => self::parseBrowser($ua),
                        'last_activity' => date('c', (int) $s->last_activity),
                    ];
                })
                ->all();
        } catch (\Throwable) {
        }

        $schemas = [];
        try {
            $schemas = DB::select(
                "SELECT nspname AS schema FROM pg_namespace WHERE nspname LIKE 'rest_%' ORDER BY nspname LIMIT 80",
            );
        } catch (\Throwable) {
        }

        return Inertia::render('plataforma/operaciones/index', [
            'stats' => [
                'tenants' => $tenants,
                'activos' => $activos,
                'suspendidos' => $suspendidos,
                'trial' => $trial,
                'subs_activas' => $subsActivas,
                'usuarios' => $usuarios,
                'sedes' => $sedes,
                'schemas' => count($schemas),
            ],
            'recientes' => $recientes,
            'sesiones' => $sesiones,
            'schemas' => collect($schemas)->pluck('schema')->values(),
            'quick_links' => [
                ['href' => '/plataforma/tenants', 'label' => 'Tenants', 'hint' => 'Alta, suspensión e impersonation'],
                ['href' => '/plataforma/suscripciones', 'label' => 'Suscripciones', 'hint' => 'Planes, trial y cancelaciones'],
                ['href' => '/plataforma/cobros', 'label' => 'Cobros', 'hint' => 'Pagos y conciliación'],
                ['href' => '/plataforma/reportes', 'label' => 'Reportes', 'hint' => 'Distribución y uso'],
                ['href' => '/plataforma/uso-planes', 'label' => 'Uso de planes', 'hint' => 'Límites y features'],
            ],
        ]);
    }

    private static function parseBrowser(string $ua): string
    {
        $ua = trim($ua);
        if ($ua === '') {
            return '—';
        }
        if (str_contains($ua, 'Edg/')) {
            return 'Edge';
        }
        if (str_contains($ua, 'Chrome/') && ! str_contains($ua, 'Edg/')) {
            return 'Chrome';
        }
        if (str_contains($ua, 'Firefox/')) {
            return 'Firefox';
        }
        if (str_contains($ua, 'Safari/') && ! str_contains($ua, 'Chrome/')) {
            return 'Safari';
        }

        return mb_substr($ua, 0, 28).'…';
    }
}

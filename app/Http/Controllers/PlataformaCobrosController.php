<?php

namespace App\Http\Controllers;

use App\Exports\SubscriptionPaymentsXlsxExport;
use App\Models\SubscriptionPayment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PlataformaCobrosController extends Controller
{
    public function index(Request $request): Response
    {
        $estado = (string) $request->string('estado', 'todos');
        $subscriptionId = $request->string('subscription_id')->toString();

        $query = SubscriptionPayment::query()
            ->with(['tenant:id,razon_social,nombre_comercial,slug', 'plan:id,nombre,codigo'])
            ->orderByDesc('created_at');

        if ($estado !== 'todos') {
            $query->where('estado', $estado);
        }
        if ($subscriptionId !== '') {
            $query->where('subscription_id', $subscriptionId);
        }

        $pagos = $query->paginate(20)->withQueryString()->through(fn (SubscriptionPayment $p) => [
            'id' => $p->id,
            'tenant' => $p->tenant?->nombre_comercial ?: $p->tenant?->razon_social,
            'slug' => $p->tenant?->slug,
            'plan' => $p->plan?->nombre,
            'total' => (float) $p->total,
            'moneda' => $p->moneda,
            'estado' => $p->estado,
            'pasarela' => $p->pasarela,
            'pagado_at' => $p->pagado_at?->toIso8601String(),
            'created_at' => $p->created_at?->toIso8601String(),
            'subscription_id' => $p->subscription_id,
        ]);

        return Inertia::render('plataforma/cobros/index', [
            'pagos' => $pagos,
            'filters' => [
                'estado' => $estado,
                'subscription_id' => $subscriptionId,
            ],
            'stats' => [
                'total' => SubscriptionPayment::query()->count(),
                'pagados' => SubscriptionPayment::query()->where('estado', 'pagado')->count(),
                'monto_pagado' => (float) SubscriptionPayment::query()->where('estado', 'pagado')->sum('total'),
            ],
        ]);
    }

    public function export(): StreamedResponse
    {
        $filename = 'cobros-'.now()->format('Ymd-His').'.xlsx';
        $exporter = new SubscriptionPaymentsXlsxExport;
        $query = SubscriptionPayment::query()->with(['tenant', 'plan'])->orderByDesc('created_at');

        return response()->streamDownload(
            fn () => $exporter->streamTo($query),
            $filename,
            [
                'Content-Type' => 'application/vnd.openxmlformats.spreadsheetml.sheet',
                'Cache-Control' => 'no-store, no-cache, must-revalidate',
            ],
        );
    }
}

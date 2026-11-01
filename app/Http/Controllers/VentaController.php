<?php

namespace App\Http\Controllers;

use App\Exports\VentasXlsxExport;
use App\Http\Controllers\Concerns\ResolvesActiveSede;
use App\Http\Controllers\Concerns\ResolvesTenantId;
use App\Http\Controllers\Concerns\RespondsToApiPeruConsulta;
use App\Models\Pago;
use App\Models\Pedido;
use App\Models\PedidoLinea;
use App\Models\ProductoCarta;
use App\Models\RestaurantSetting;
use App\Models\Venta;
use App\Services\Integrations\ApiPeruDniService;
use App\Services\Integrations\ApiPeruRucService;
use App\Services\Fel\FelEmisionVentaService;
use App\Services\Operacion\CajaService;
use App\Services\Operacion\VentaTicketPdfService;
use App\Support\Caja\TicketAnchoMm;
use App\Support\Fel\FelComprobanteAvailability;
use App\Support\Fel\FelDocumentPdfUrls;
use App\Support\Sedes\ActiveSedeContext;
use App\Tenancy\TenantManager;
use RuntimeException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VentaController extends Controller
{
    use ResolvesActiveSede;
    use ResolvesTenantId;
    use RespondsToApiPeruConsulta;

    public function index(Request $request, CajaService $caja): Response
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $sesion = $sedeId === '' ? null : $caja->sesionAbierta($sedeId);

        $search = trim((string) $request->query('search', ''));
        $vista = (string) $request->query('vista', 'historial');
        if (! in_array($vista, ['historial', 'por_cobrar'], true)) {
            $vista = 'historial';
        }
        $estado = (string) $request->query('estado', 'todos');
        $medio = (string) $request->query('medio', 'todos');
        $tipo = (string) $request->query('tipo', 'todos');
        $hoy = now()->toDateString();
        $desde = trim((string) $request->query('desde', ''));
        $hasta = trim((string) $request->query('hasta', ''));
        $perPage = min(100, max(10, (int) $request->query('per_page', 15)));
        $sort = (string) $request->query('sort', 'created_at');
        $direction = strtolower((string) $request->query('direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSort = ['created_at', 'total', 'numero', 'estado'];
        if (! in_array($sort, $allowedSort, true)) {
            $sort = 'created_at';
        }

        if ($desde === '' || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde)) {
            $desde = $hoy;
        }
        if ($hasta === '' || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta)) {
            $hasta = $hoy;
        }
        if ($desde > $hasta) {
            [$desde, $hasta] = [$hasta, $desde];
        }

        $pedidosPendientes = collect();
        $ventasQuery = Venta::query()->whereRaw('1 = 0');

        if ($sedeId !== '') {
            $pedidosQuery = Pedido::query()
                ->with(['mesa:id,codigo,nombre', 'openedBy:id,name'])
                ->where('sede_id', $sedeId)
                ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
                ->where('total', '>', 0)
                ->whereHas('lineas', fn ($q) => $q->whereIn('estado', [
                    PedidoLinea::ESTADO_EN_COLA,
                    PedidoLinea::ESTADO_LISTO,
                ]));

            if ($vista === 'por_cobrar' && $search !== '') {
                $pedidosQuery->where(function ($q) use ($search): void {
                    $q->whereHas('mesa', function ($mq) use ($search): void {
                        $mq->where('codigo', 'ilike', '%'.$search.'%')
                            ->orWhere('nombre', 'ilike', '%'.$search.'%');
                    })->orWhereHas('openedBy', function ($uq) use ($search): void {
                        $uq->where('name', 'ilike', '%'.$search.'%');
                    });

                    if (ctype_digit(ltrim($search, '#'))) {
                        $q->orWhere('numero', (int) ltrim($search, '#'));
                    }
                });
            }

            $pedidosPendientes = $pedidosQuery
                ->orderByDesc('updated_at')
                ->get(['id', 'numero', 'mesa_id', 'canal', 'estado', 'total', 'subtotal', 'descuento', 'opened_by', 'updated_at']);

            $ventasQuery = $this->filteredVentasQuery(
                $sedeId,
                $search,
                $estado,
                $medio,
                $tipo,
                $desde,
                $hasta,
            );
        }

        $statsBase = (clone $ventasQuery);
        $stats = [
            'pendientes' => $pedidosPendientes->count(),
            'monto_total' => round((float) (clone $statsBase)->where('estado', Venta::ESTADO_PAGADA)->sum('total'), 2),
            'ventas' => (clone $statsBase)->count(),
            'pagadas' => (clone $statsBase)->where('estado', Venta::ESTADO_PAGADA)->count(),
            'anuladas' => (clone $statsBase)->where('estado', Venta::ESTADO_ANULADA)->count(),
            'coincidencias' => 0,
        ];

        $ventas = $ventasQuery
            ->orderBy($sort, $direction)
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Venta $v): array => $this->serializeVentaRow($v));

        $stats['coincidencias'] = $vista === 'por_cobrar'
            ? $pedidosPendientes->count()
            : $ventas->total();

        // Si hay búsqueda en por_cobrar, el count de pendientes del badge
        // debe reflejar el total real sin filtro de texto.
        if ($vista === 'por_cobrar' && $search !== '' && $sedeId !== '') {
            $stats['pendientes'] = Pedido::query()
                ->where('sede_id', $sedeId)
                ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
                ->where('total', '>', 0)
                ->whereHas('lineas', fn ($q) => $q->whereIn('estado', [
                    PedidoLinea::ESTADO_EN_COLA,
                    PedidoLinea::ESTADO_LISTO,
                ]))
                ->count();
        }

        $ticketAncho = TicketAnchoMm::DEFAULT;
        if (RestaurantSetting::tableReady()) {
            $ticketAncho = TicketAnchoMm::normalize(
                (string) (RestaurantSetting::query()->value('ticket_ancho_mm') ?? ''),
            );
        }

        $openTicket = trim((string) $request->query('ticket', ''));
        if ($openTicket !== '' && ! preg_match('/^[0-9a-fA-F-]{36}$/', $openTicket)) {
            $openTicket = '';
        }

        $openPrint = null;
        $openCpe = null;
        if ($openTicket !== '') {
            $ventaOpen = Venta::query()
                ->with('felDocument:id,venta_id,numero_completo,estado,url_pdf,enlace_consulta')
                ->find($openTicket);
            if ($ventaOpen !== null) {
                $doc = $ventaOpen->felDocument;
                $pdf = $doc?->url_pdf ?: $doc?->enlace_consulta;
                $esCpe = in_array((string) $ventaOpen->tipo_comprobante, [Venta::TIPO_BOLETA, Venta::TIPO_FACTURA], true);
                if ($esCpe && (string) $ventaOpen->fel_estado === Venta::FEL_EMITIDO && filled($pdf)) {
                    $openPrint = 'cpe';
                    $openCpe = [
                        'venta_id' => $ventaOpen->id,
                        'tipo_comprobante' => $ventaOpen->tipo_comprobante,
                        'numero_completo' => $doc?->numero_completo,
                        'pdf_ticket_url' => $doc?->url_pdf,
                        'pdf_a4_url' => FelDocumentPdfUrls::pdfA4FromTicket($doc?->url_pdf),
                        'enlace_consulta' => $doc?->enlace_consulta,
                    ];
                } else {
                    $openPrint = 'ticket';
                }
            }
        }

        return Inertia::render('ventas/index', [
            'sesion_abierta' => $sesion !== null,
            'vista' => $vista,
            'ventas' => $ventas,
            'pedidos_pendientes' => $pedidosPendientes,
            'medios' => Pago::MEDIOS,
            'tipos_comprobante' => Venta::TIPOS_COMPROBANTE,
            'ticket_ancho_mm' => $ticketAncho,
            'open_ticket_id' => $openPrint === 'ticket' && $openTicket !== '' ? $openTicket : null,
            'open_cpe' => $openCpe,
            'filters' => [
                'sede_id' => $sedeId !== '' ? $sedeId : null,
                'search' => $search,
                'vista' => $vista,
                'estado' => $estado,
                'medio' => $medio,
                'tipo' => $tipo,
                'desde' => $desde,
                'hasta' => $hasta,
                'per_page' => $perPage,
                'sort' => $sort,
                'direction' => $direction,
            ],
            'stats' => $stats,
        ]);
    }

    public function pendientes(CajaService $caja): Response
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $sesion = $sedeId === '' ? null : $caja->sesionAbierta($sedeId);

        $pedidosPendientes = $sedeId === ''
            ? collect()
            : Pedido::query()
                ->with(['mesa:id,codigo,nombre', 'openedBy:id,name'])
                ->where('sede_id', $sedeId)
                ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
                ->where('total', '>', 0)
                ->whereHas('lineas', fn ($q) => $q->whereIn('estado', [
                    PedidoLinea::ESTADO_EN_COLA,
                    PedidoLinea::ESTADO_LISTO,
                ]))
                ->orderByDesc('updated_at')
                ->get(['id', 'numero', 'mesa_id', 'canal', 'estado', 'total', 'subtotal', 'descuento', 'opened_by', 'updated_at']);

        return Inertia::render('ventas/pendientes', [
            'sesion_abierta' => $sesion !== null,
            'pedidos_pendientes' => $pedidosPendientes,
            'stats' => [
                'pendientes' => $pedidosPendientes->count(),
            ],
        ]);
    }

    public function create(CajaService $caja): Response
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $sesion = $sedeId === '' ? null : $caja->sesionAbierta($sedeId);

        $productos = $sedeId === ''
            ? collect()
            : ProductoCarta::query()
                ->with(['categoria:id,nombre'])
                ->where('sede_id', $sedeId)
                ->where('activo', true)
                ->orderBy('orden')
                ->orderBy('nombre')
                ->get([
                    'id',
                    'categoria_id',
                    'nombre',
                    'codigo',
                    'codigo_barras',
                    'precio',
                    'imagen_path',
                    'control_inventario',
                    'stock',
                ]);

        $sedePayload = collect(ActiveSedeContext::accessibleCatalog())
            ->firstWhere('id', $sedeId);

        $pedidosPendientes = $sedeId === ''
            ? collect()
            : Pedido::query()
                ->with([
                    'mesa:id,codigo,nombre',
                    'openedBy:id,name',
                    'lineas' => fn ($q) => $q
                        ->whereIn('estado', [
                            PedidoLinea::ESTADO_EN_COLA,
                            PedidoLinea::ESTADO_LISTO,
                        ])
                        ->orderBy('orden')
                        ->select([
                            'id',
                            'pedido_id',
                            'producto_id',
                            'nombre',
                            'precio_unitario',
                            'cantidad',
                            'importe',
                            'estado',
                        ]),
                ])
                ->where('sede_id', $sedeId)
                ->whereIn('estado', Pedido::ESTADOS_ACTIVOS)
                ->where('total', '>', 0)
                ->whereHas('lineas', fn ($q) => $q->whereIn('estado', [
                    PedidoLinea::ESTADO_EN_COLA,
                    PedidoLinea::ESTADO_LISTO,
                ]))
                // Sin ítems pendientes: mismos criterios que CajaService::cobrarPedido.
                ->whereDoesntHave('lineas', fn ($q) => $q->where(
                    'estado',
                    PedidoLinea::ESTADO_PENDIENTE,
                ))
                ->orderByDesc('updated_at')
                ->get([
                    'id',
                    'numero',
                    'mesa_id',
                    'canal',
                    'estado',
                    'total',
                    'subtotal',
                    'descuento',
                    'opened_by',
                    'updated_at',
                ]);

        $fel = FelComprobanteAvailability::forSede($sedeId);
        $tipos = $fel['tipos'];

        return Inertia::render('ventas/nueva', [
            'sesion_abierta' => $sesion !== null,
            'productos' => $productos,
            'pedidos_pendientes' => $pedidosPendientes,
            'medios' => Pago::MEDIOS,
            'tipos_comprobante' => $tipos,
            'emite_comprobantes_sunat' => $fel['emite_comprobantes_sunat'],
            'fel' => [
                'apisunat_configurado' => $fel['apisunat_configurado'],
                'serie_boleta' => $fel['serie_boleta'],
                'serie_factura' => $fel['serie_factura'],
                'plan_boleta' => $fel['plan_boleta'],
                'plan_factura' => $fel['plan_factura'],
            ],
            'sede' => $sedePayload,
        ]);
    }

    public function consultaDni(Request $request, ApiPeruDniService $apiPeru): JsonResponse
    {
        $this->tenantIdOrAbort();

        $dni = preg_replace('/\D+/', '', (string) $request->query('dni', '')) ?? '';
        $request->merge(['dni' => $dni]);

        $validated = $request->validate([
            'dni' => ['required', 'string', 'regex:/^[0-9]{8}$/'],
        ]);

        return $this->consultaApiPeruResponse(
            fn () => $apiPeru->consultar($validated['dni']),
        );
    }

    public function consultaRuc(Request $request, ApiPeruRucService $apiPeru): JsonResponse
    {
        $this->tenantIdOrAbort();

        $ruc = preg_replace('/\D+/', '', (string) $request->query('ruc', '')) ?? '';
        $request->merge(['ruc' => $ruc]);

        $validated = $request->validate([
            'ruc' => ['required', 'string', 'regex:/^[0-9]{11}$/'],
        ]);

        return $this->consultaApiPeruResponse(
            fn () => $apiPeru->consultar($validated['ruc']),
        );
    }

    public function store(Request $request, CajaService $caja): RedirectResponse
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        if ($sedeId === '') {
            return redirect()
                ->route('ventas.index')
                ->with('error', 'Selecciona una sede activa.');
        }

        $tiposPermitidos = FelComprobanteAvailability::forSede($sedeId)['tipos'];

        $data = $request->validate([
            'tipo_comprobante' => ['required', Rule::in($tiposPermitidos)],
            'cliente_nombre' => ['nullable', 'string', 'max:180'],
            'cliente_documento' => ['nullable', 'string', 'max:20'],
            'descuento' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.producto_id' => ['required', 'uuid'],
            'items.*.cantidad' => ['required', 'numeric', 'min:0.001'],
            'pagos' => ['required', 'array', 'min:1'],
            'pagos.*.medio' => ['required', Rule::in(Pago::MEDIOS)],
            'pagos.*.monto' => ['required', 'numeric', 'min:0.01'],
            'pagos.*.referencia' => ['nullable', 'string', 'max:120'],
        ]);

        FelComprobanteAvailability::assertPuedeEmitir(
            $sedeId,
            (string) $data['tipo_comprobante'],
        );

        $venta = $caja->registrarVentaRapida($sedeId, $data);

        $mensaje = 'Venta '.$venta->numero.' registrada por S/ '.number_format((float) $venta->total, 2);
        $flashKey = 'success';

        if (in_array((string) $venta->tipo_comprobante, [Venta::TIPO_BOLETA, Venta::TIPO_FACTURA], true)) {
            try {
                $doc = app(FelEmisionVentaService::class)->emitir($venta->fresh(['pedido.lineas']));
                $mensaje .= ' · CPE '.$doc->numero_completo.' ('.strtoupper((string) $doc->estado).')';
            } catch (RuntimeException $e) {
                $flashKey = 'error';
                $mensaje .= ' · No se emitió el CPE: '.$e->getMessage();
            } catch (\Throwable $e) {
                report($e);
                $flashKey = 'error';
                $mensaje .= ' · Error al emitir el CPE. Revisa Facturación.';
            }
        }

        return redirect()
            ->route('ventas.index', ['ticket' => $venta->id])
            ->with($flashKey, $mensaje);
    }

    public function emitirFel(Venta $venta): RedirectResponse
    {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $venta->sede_id);

        if (! in_array((string) $venta->tipo_comprobante, [Venta::TIPO_BOLETA, Venta::TIPO_FACTURA], true)) {
            return back()->with('error', 'Solo boletas y facturas emiten CPE.');
        }

        FelComprobanteAvailability::assertPuedeEmitir(
            (string) $venta->sede_id,
            (string) $venta->tipo_comprobante,
        );

        try {
            $doc = app(FelEmisionVentaService::class)->emitir($venta->fresh(['pedido.lineas']));
        } catch (RuntimeException $e) {
            return back()->with('error', 'No se emitió el CPE: '.$e->getMessage());
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', 'Error al emitir el CPE. Revisa Facturación.');
        }

        return redirect()
            ->route('ventas.index', ['ticket' => $venta->id])
            ->with(
                'success',
                'CPE '.$doc->numero_completo.' ('.strtoupper((string) $doc->estado).')',
            );
    }

    public function cobrarForm(Pedido $pedido, CajaService $caja): Response
    {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $pedido->sede_id);

        $pedido->load([
            'mesa:id,codigo,nombre',
            'openedBy:id,name',
            'lineas' => fn ($q) => $q->whereIn('estado', [
                PedidoLinea::ESTADO_EN_COLA,
                PedidoLinea::ESTADO_LISTO,
                PedidoLinea::ESTADO_PENDIENTE,
            ]),
        ]);

        $sesion = $caja->sesionAbierta((string) $pedido->sede_id);

        return Inertia::render('ventas/cobrar', [
            'pedido' => $pedido,
            'sesion_abierta' => $sesion !== null,
            'medios' => Pago::MEDIOS,
        ]);
    }

    public function cobrar(Request $request, Pedido $pedido, CajaService $caja): RedirectResponse
    {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $pedido->sede_id);

        $data = $request->validate([
            'descuento' => ['nullable', 'numeric', 'min:0'],
            'pagos' => ['required', 'array', 'min:1'],
            'pagos.*.medio' => ['required', Rule::in(Pago::MEDIOS)],
            'pagos.*.monto' => ['required', 'numeric', 'min:0.01'],
            'pagos.*.referencia' => ['nullable', 'string', 'max:120'],
        ]);

        $venta = $caja->cobrarPedido(
            $pedido,
            $data['pagos'],
            isset($data['descuento']) ? (float) $data['descuento'] : null,
        );

        return redirect()
            ->route('ventas.index', ['ticket' => $venta->id])
            ->with('success', 'Venta registrada por S/ '.number_format((float) $venta->total, 2));
    }

    public function detalle(Venta $venta): JsonResponse
    {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $venta->sede_id);

        $venta->loadMissing([
            'pedido.lineas',
            'pedido.mesa:id,codigo,nombre',
            'sede:id,nombre,codigo',
            'pagos',
            'createdBy:id,name',
            'felDocument:id,venta_id,numero_completo,estado,url_pdf,url_xml,url_cdr,enlace_consulta,apisunat_mode,error_mensaje',
        ]);

        $lineas = [];
        if ($venta->pedido !== null) {
            foreach ($venta->pedido->lineas as $linea) {
                if ($linea->estado === 'anulado') {
                    continue;
                }
                $lineas[] = [
                    'id' => $linea->id,
                    'nombre' => (string) $linea->nombre,
                    'cantidad' => (string) $linea->cantidad,
                    'precio_unitario' => (string) $linea->precio_unitario,
                    'importe' => (string) $linea->importe,
                ];
            }
        }

        $doc = $venta->felDocument;
        $pdfTicket = $doc?->url_pdf;

        return response()->json([
            'venta' => [
                'id' => $venta->id,
                'numero' => $venta->numero,
                'numero_display' => $doc?->numero_completo ?? $venta->numero,
                'origen' => $venta->origen,
                'tipo_comprobante' => $venta->tipo_comprobante,
                'fel_estado' => (string) ($venta->fel_estado ?? Venta::FEL_SIN_CPE),
                'cpe_numero' => $doc?->numero_completo,
                'fel_pdf_url' => $pdfTicket,
                'fel_pdf_a4_url' => FelDocumentPdfUrls::pdfA4FromTicket($pdfTicket),
                'fel_enlace_consulta' => $doc?->enlace_consulta,
                'fel_error' => $doc?->error_mensaje,
                'cliente_nombre' => $venta->cliente_nombre,
                'cliente_documento' => $venta->cliente_documento,
                'estado' => $venta->estado,
                'subtotal' => (string) $venta->subtotal,
                'descuento' => (string) $venta->descuento,
                'total' => (string) $venta->total,
                'created_at' => $venta->created_at?->toIso8601String(),
                'sede' => $venta->sede
                    ? [
                        'id' => $venta->sede->id,
                        'nombre' => $venta->sede->nombre,
                        'codigo' => $venta->sede->codigo,
                    ]
                    : null,
                'pedido' => $venta->pedido
                    ? [
                        'id' => $venta->pedido->id,
                        'numero' => $venta->pedido->numero,
                        'canal' => $venta->pedido->canal,
                        'mesa' => $venta->pedido->mesa
                            ? [
                                'codigo' => $venta->pedido->mesa->codigo,
                                'nombre' => $venta->pedido->mesa->nombre,
                            ]
                            : null,
                    ]
                    : null,
                'pagos' => $venta->pagos->map(static fn ($p): array => [
                    'id' => $p->id,
                    'medio' => $p->medio,
                    'monto' => (string) $p->monto,
                    'referencia' => $p->referencia,
                ])->values()->all(),
                'created_by' => $venta->createdBy
                    ? ['id' => $venta->createdBy->id, 'name' => $venta->createdBy->name]
                    : null,
                'lineas' => $lineas,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeVentaRow(Venta $v): array
    {
        $doc = $v->relationLoaded('felDocument') ? $v->felDocument : null;
        $pdfTicket = $doc?->url_pdf;

        return [
            'id' => $v->id,
            'numero' => $v->numero,
            'numero_display' => $doc?->numero_completo ?? $v->numero,
            'origen' => $v->origen,
            'tipo_comprobante' => $v->tipo_comprobante,
            'fel_estado' => (string) ($v->fel_estado ?? Venta::FEL_SIN_CPE),
            'cpe_numero' => $doc?->numero_completo,
            'fel_pdf_url' => $pdfTicket,
            'fel_pdf_a4_url' => FelDocumentPdfUrls::pdfA4FromTicket($pdfTicket),
            'fel_enlace_consulta' => $doc?->enlace_consulta,
            'cliente_nombre' => $v->cliente_nombre,
            'cliente_documento' => $v->cliente_documento,
            'estado' => $v->estado,
            'total' => (string) $v->total,
            'created_at' => $v->created_at?->toIso8601String(),
            'pedido' => $v->pedido
                ? [
                    'id' => $v->pedido->id,
                    'numero' => $v->pedido->numero,
                    'canal' => $v->pedido->canal,
                    'mesa' => $v->pedido->mesa
                        ? [
                            'id' => $v->pedido->mesa->id,
                            'codigo' => $v->pedido->mesa->codigo,
                            'nombre' => $v->pedido->mesa->nombre,
                        ]
                        : null,
                ]
                : null,
            'pagos' => $v->pagos->map(static fn ($p): array => [
                'id' => $p->id,
                'medio' => $p->medio,
                'monto' => (string) $p->monto,
            ])->values()->all(),
            'created_by' => $v->createdBy
                ? ['id' => $v->createdBy->id, 'name' => $v->createdBy->name]
                : null,
        ];
    }

    /**
     * Vista HTML para impresora térmica (mismo patrón que VetSaaS).
     */
    public function ticket(Request $request, Venta $venta, VentaTicketPdfService $tickets): View
    {
        return $this->ticketHtmlResponse($request, $venta, $tickets);
    }

    /**
     * PDF inline, o HTML de preview si ?html=1 (el modal usa HTML para evitar el visor PDF).
     */
    public function ticketPdf(Request $request, Venta $venta, VentaTicketPdfService $tickets): SymfonyResponse|View
    {
        if ($request->boolean('html')) {
            return $this->ticketHtmlResponse($request, $venta, $tickets);
        }

        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $venta->sede_id);

        $cfg = RestaurantSetting::tableReady() ? RestaurantSetting::query()->first() : null;
        $formato = TicketAnchoMm::fromRequest($request, $cfg?->ticket_ancho_mm);

        if (
            $request->boolean('persist')
            && $cfg !== null
            && TicketAnchoMm::normalize((string) $cfg->ticket_ancho_mm) !== $formato
        ) {
            $cfg->forceFill(['ticket_ancho_mm' => $formato])->save();
        }

        $filename = 'ticket-'.($venta->numero ?: $venta->id).'-'.$formato.'mm.pdf';
        $cacheKey = 'venta_ticket_pdf:'.$venta->id.':'.$formato.':'.($venta->updated_at?->timestamp ?? 0);

        try {
            $binary = Cache::remember(
                $cacheKey,
                now()->addMinutes(5),
                static function () use ($tickets, $venta, $formato): string {
                    return $tickets->render($venta, $formato)->output();
                },
            );

            return response($binary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="'.$filename.'"',
                'Cache-Control' => 'private, max-age=120',
            ]);
        } catch (\Throwable $e) {
            report($e);
            Cache::forget($cacheKey);

            return response(
                'No se pudo generar el ticket: '.$e->getMessage(),
                500,
                ['Content-Type' => 'text/plain; charset=UTF-8'],
            );
        }
    }

    private function ticketHtmlResponse(
        Request $request,
        Venta $venta,
        VentaTicketPdfService $tickets,
    ): View {
        $this->tenantIdOrAbort();
        ActiveSedeContext::assertAccessible((string) $venta->sede_id);

        $cfg = RestaurantSetting::tableReady() ? RestaurantSetting::query()->first() : null;
        $formato = TicketAnchoMm::fromRequest($request, $cfg?->ticket_ancho_mm);

        if (
            $request->boolean('persist')
            && $cfg !== null
            && TicketAnchoMm::normalize((string) $cfg->ticket_ancho_mm) !== $formato
        ) {
            $cfg->forceFill(['ticket_ancho_mm' => $formato])->save();
        }

        $data = $tickets->viewData($venta, $formato, false);
        $data['auto_print'] = $request->boolean('print');

        return view('operacion.venta-ticket', $data);
    }

    public function export(Request $request): StreamedResponse
    {
        $this->tenantIdOrAbort();

        $sedeId = ActiveSedeContext::id() ?? '';
        $search = trim((string) $request->query('search', ''));
        $estado = (string) $request->query('estado', 'todos');
        $medio = (string) $request->query('medio', 'todos');
        $tipo = (string) $request->query('tipo', 'todos');
        $hoy = now()->toDateString();
        $desde = trim((string) $request->query('desde', ''));
        $hasta = trim((string) $request->query('hasta', ''));
        $sort = (string) $request->query('sort', 'created_at');
        $direction = strtolower((string) $request->query('direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSort = ['created_at', 'total', 'numero', 'estado'];
        if (! in_array($sort, $allowedSort, true)) {
            $sort = 'created_at';
        }

        if ($desde === '' || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde)) {
            $desde = $hoy;
        }
        if ($hasta === '' || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta)) {
            $hasta = $hoy;
        }
        if ($desde > $hasta) {
            [$desde, $hasta] = [$hasta, $desde];
        }

        $query = $sedeId === ''
            ? Venta::query()->whereRaw('1 = 0')
            : $this->filteredVentasQuery(
                $sedeId,
                $search,
                $estado,
                $medio,
                $tipo,
                $desde,
                $hasta,
            );

        $query->orderBy($sort, $direction);

        $export = new VentasXlsxExport;

        return response()->streamDownload(
            fn () => $export->streamTo($query),
            'ventas-'.$desde.'_'.$hasta.'-'.now()->format('His').'.xlsx',
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
        );
    }

    /**
     * @return Builder<Venta>
     */
    private function filteredVentasQuery(
        string $sedeId,
        string $search,
        string $estado,
        string $medio,
        string $tipo,
        string $desde,
        string $hasta,
    ): Builder {
        $query = Venta::query()
            ->with([
                'pedido:id,numero,canal,mesa_id',
                'pedido.mesa:id,codigo,nombre',
                'sede:id,nombre,codigo',
                'pagos',
                'createdBy:id,name',
                'felDocument:id,venta_id,numero_completo,estado,url_pdf,enlace_consulta',
            ])
            ->where('sede_id', $sedeId)
            ->whereDate('created_at', '>=', $desde)
            ->whereDate('created_at', '<=', $hasta);

        if ($estado === 'pagada' || $estado === 'anulada') {
            $query->where('estado', $estado);
        }

        if ($tipo !== 'todos' && in_array($tipo, Venta::TIPOS_COMPROBANTE, true)) {
            $query->where('tipo_comprobante', $tipo);
        }

        if ($medio !== 'todos' && in_array($medio, Pago::MEDIOS, true)) {
            $query->whereHas('pagos', fn ($q) => $q->where('medio', $medio));
        }

        if ($search !== '') {
            $like = '%'.addcslashes($search, '%_\\').'%';
            $query->where(function ($q) use ($search, $like): void {
                $q->where('numero', 'ilike', $like)
                    ->orWhere('cliente_nombre', 'ilike', $like)
                    ->orWhere('cliente_documento', 'ilike', $like)
                    ->orWhereHas(
                        'felDocument',
                        fn ($fq) => $fq->where('numero_completo', 'ilike', $like),
                    );

                if (ctype_digit(ltrim($search, '#'))) {
                    $num = (int) ltrim($search, '#');
                    $q->orWhereHas('pedido', fn ($pq) => $pq->where('numero', $num));
                }
            });
        }

        return $query;
    }

}

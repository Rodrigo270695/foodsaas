<?php

namespace App\Http\Controllers;

use App\Exports\FelDocumentsXlsxExport;
use App\Http\Controllers\Concerns\LogsAuditExports;
use App\Models\FelDocument;
use App\Models\FelSerie;
use App\Models\Pago;
use App\Models\RestaurantSetting;
use App\Models\Sede;
use App\Services\Fel\FelDocumentApisunatFileService;
use App\Services\Fel\FelDocumentStatusSyncService;
use App\Services\Fel\FelSandboxToProduccionService;
use App\Support\Fel\ApisunatCredentialResolver;
use App\Support\Fel\FelDocumentApisunatModeResolver;
use App\Support\Fel\FelDocumentPdfUrls;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class FelDocumentController extends Controller
{
    use LogsAuditExports;

    private const PER_PAGE_OPTIONS = [10, 15, 20, 25, 50, 100];

    private const SORTABLE_COLUMNS = [
        'emitido_at',
        'numero_completo',
        'total',
        'estado',
    ];

    private const METODOS_PAGO = Pago::MEDIOS;

    public function index(Request $request): Response
    {
        $tenantId = tenant_id();

        $ctx = $this->resolveDocumentosContext($request);
        $perPage = $ctx['per_page'];
        $sortValid = $ctx['sort_valid'];
        $directionValid = $ctx['direction_valid'];
        $documentoFiltroUi = $ctx['documento_filtro_ui'];

        $query = $this->buildDocumentosQuery($ctx)
            ->with([
                'venta:id,numero,sede_id,estado,cliente_nombre,cliente_documento',
                'venta.pagos:id,venta_id,medio,monto',
            ]);

        $montoFiltrado = round((float) ((clone $query)->reorder()->sum('total') ?? 0), 2);

        $documentos = $query->paginate($perPage)->withQueryString();

        $sedeIds = $documentos->getCollection()
            ->pluck('venta.sede_id')
            ->filter()
            ->unique()
            ->all();

        $sedeNombres = Sede::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $sedeIds)
            ->pluck('nombre', 'id');

        $sandboxProd = app(FelSandboxToProduccionService::class);
        $siguientesSandbox = $sandboxProd->siguientesPendientesPorSerie();
        $cfg = RestaurantSetting::current();
        $restauranteEnProduccion = ($cfg->apisunat_mode ?? 'sandbox') === 'produccion'
            && ApisunatCredentialResolver::estaConfigurado($cfg);

        $documentos->getCollection()->transform(function (FelDocument $doc) use ($sedeNombres, $siguientesSandbox, $restauranteEnProduccion): array {
            $venta = $doc->venta;
            $pdfTicket = $doc->url_pdf;
            $pdfA4 = FelDocumentPdfUrls::pdfA4FromTicket($pdfTicket);
            $mode = FelDocumentApisunatModeResolver::resolveAndPersist($doc);
            $esSandbox = $mode === 'sandbox' && $doc->estado === FelDocument::ESTADO_EMITIDO;
            $siguiente = $siguientesSandbox[(string) $doc->serie] ?? null;
            $puedePasar = $restauranteEnProduccion
                && $esSandbox
                && $siguiente !== null
                && (int) $doc->correlativo === (int) $siguiente;

            $primerPago = $venta?->pagos?->first();

            return [
                'id' => $doc->id,
                'numero_completo' => $doc->numero_completo,
                'tipo_comprobante' => $doc->tipo_comprobante,
                'tipo_label' => FelSerie::labelTipo($doc->tipo_comprobante),
                'estado' => $doc->estado,
                'receptor_nombre' => $doc->receptor_nombre,
                'receptor_num_doc' => $doc->receptor_num_doc,
                'total' => (string) $doc->total,
                'moneda' => $doc->moneda,
                'emitido_at' => $doc->emitido_at?->toIso8601String(),
                'venta_id' => $doc->venta_id,
                'venta_numero' => $venta?->numero,
                'venta_estado' => $venta?->estado,
                'metodo_pago' => $primerPago?->medio,
                'sede' => $venta !== null ? ($sedeNombres[$venta->sede_id] ?? '—') : '—',
                'cliente_telefono' => null,
                'url_pdf_ticket' => $pdfTicket,
                'url_pdf_a4' => $pdfA4,
                'tiene_xml' => filled($doc->url_xml),
                'tiene_cdr' => filled($doc->url_cdr),
                'tiene_json' => true,
                'download_xml_url' => route('facturacion.documentos.download-xml', $doc),
                'download_cdr_url' => route('facturacion.documentos.download-cdr', $doc),
                'json_url' => route('facturacion.documentos.json', $doc),
                'apisunat_mode' => $mode,
                'puede_pasar_a_produccion' => $puedePasar,
                'pasar_a_produccion_url' => route('facturacion.documentos.pasar-a-produccion', $doc),
                'siguiente_sandbox_numero' => $siguiente !== null
                    ? ((string) $doc->serie).'-'.str_pad((string) $siguiente, 8, '0', STR_PAD_LEFT)
                    : null,
                'error_mensaje' => $doc->error_mensaje,
                'sincronizar_estado_url' => route('facturacion.documentos.sincronizar-estado', $doc),
            ];
        });

        return Inertia::render('facturacion/documentos/index', [
            'documentos' => $documentos,
            'filters' => [
                'search' => $ctx['search'],
                'per_page' => $perPage,
                'sort' => $sortValid ? $ctx['sort'] : null,
                'direction' => $sortValid && $directionValid ? $ctx['direction'] : null,
                'estado' => $ctx['estado'],
                'metodo_pago' => $ctx['metodo_pago'],
                'fecha_desde' => $ctx['fecha_desde'],
                'fecha_hasta' => $ctx['fecha_hasta'],
            ],
            'documento_filtro_ui' => $documentoFiltroUi,
            'sincronizar_estados_url' => route('facturacion.documentos.sincronizar-estados'),
            'stats' => [
                'total' => FelDocument::query()->count(),
                'emitidos' => FelDocument::query()->where('estado', FelDocument::ESTADO_EMITIDO)->count(),
                'pendientes' => FelDocument::query()->where('estado', FelDocument::ESTADO_PENDIENTE)->count(),
                'rechazados' => FelDocument::query()->where('estado', FelDocument::ESTADO_RECHAZADO)->count(),
                'coincidencias' => $documentos->total(),
                'monto_total' => number_format($montoFiltrado, 2, '.', ''),
                'moneda' => 'PEN',
            ],
        ]);
    }

    /**
     * Exporta el listado filtrado de comprobantes a XLSX para cruces contables.
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        abort_unless($request->user()?->can('documentos.view'), 403);

        tenant_id();

        $ctx = $this->resolveDocumentosContext($request);

        $query = $this->buildDocumentosQuery($ctx)
            ->with([
                'venta:id,numero,sede_id,estado',
                'venta.sede:id,nombre,codigo',
                'venta.pagos:id,venta_id,medio,monto',
            ]);

        $filename = 'comprobantes-'.now()->format('Ymd-His').'.xlsx';
        $exporter = new FelDocumentsXlsxExport;

        $this->auditExport('documentos', $filename);

        return response()->streamDownload(
            function () use ($exporter, $query): void {
                $exporter->streamTo($query);
            },
            $filename,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control' => 'no-store, no-cache, must-revalidate',
                'Pragma' => 'no-cache',
            ],
        );
    }

    public function downloadXml(
        FelDocument $felDocument,
        FelDocumentApisunatFileService $lucodeFiles,
    ): StreamedResponse|RedirectResponse {
        $this->authorizeDocument($felDocument);

        return $this->proxyLucodeDownload(
            $lucodeFiles,
            $felDocument,
            'xml',
            $felDocument->numero_completo.'.xml',
            'application/xml',
        );
    }

    public function downloadCdr(
        FelDocument $felDocument,
        FelDocumentApisunatFileService $lucodeFiles,
    ): StreamedResponse|RedirectResponse {
        $this->authorizeDocument($felDocument);

        return $this->proxyLucodeDownload(
            $lucodeFiles,
            $felDocument,
            'cdr',
            'R-'.$felDocument->numero_completo.'.xml',
            'application/xml',
        );
    }

    public function json(FelDocument $felDocument): JsonResponse
    {
        $this->authorizeDocument($felDocument);

        $payload = $felDocument->apisunat_payload;

        if (! is_array($payload)) {
            $payload = [
                'numero_completo' => $felDocument->numero_completo,
                'tipo_comprobante' => $felDocument->tipo_comprobante,
                'tipo_label' => FelSerie::labelTipo($felDocument->tipo_comprobante),
                'estado' => $felDocument->estado,
                'receptor' => [
                    'tipo_doc' => $felDocument->receptor_tipo_doc,
                    'num_doc' => $felDocument->receptor_num_doc,
                    'nombre' => $felDocument->receptor_nombre,
                ],
                'totales' => [
                    'subtotal' => (string) $felDocument->subtotal,
                    'igv_monto' => (string) $felDocument->igv_monto,
                    'total' => (string) $felDocument->total,
                    'moneda' => $felDocument->moneda,
                ],
                'enlaces' => [
                    'pdf' => $felDocument->url_pdf,
                    'xml' => $felDocument->url_xml,
                    'cdr' => $felDocument->url_cdr,
                    'consulta' => $felDocument->enlace_consulta,
                ],
                'emitido_at' => $felDocument->emitido_at?->toIso8601String(),
                'venta_id' => $felDocument->venta_id,
                'nota' => 'Respuesta completa de APISUNAT no disponible para comprobantes emitidos antes de esta versión.',
            ];
        }

        return response()->json($payload, 200, [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Reenvía un CPE de sandbox a APISUNAT producción (misma serie/correlativo, en orden).
     */
    public function pasarAProduccion(
        Request $request,
        FelDocument $felDocument,
        FelSandboxToProduccionService $converter,
    ): RedirectResponse {
        abort_unless($request->user()?->can('documentos.create'), 403);

        try {
            $converted = $converter->convertir($felDocument);
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::warning('fel.pasar_a_produccion_failed', [
                'fel_document_id' => $felDocument->id,
                'message' => $e->getMessage(),
            ]);

            return back()->with('error', $e->getMessage());
        }

        return back()->with(
            'success',
            __('facturacion.fel.sandbox_prod.ok', [
                'numero' => $converted->numero_completo,
            ]),
        );
    }

    public function sincronizarEstado(
        Request $request,
        FelDocument $felDocument,
        FelDocumentStatusSyncService $sync,
    ): RedirectResponse {
        abort_unless($request->user()?->can('documentos.view'), 403);

        try {
            $result = $sync->syncDocument($felDocument);
        } catch (Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        $label = match ($result['sunat']) {
            'ACEPTADO' => 'aceptado por SUNAT',
            'PENDIENTE' => 'pendiente en SUNAT',
            'RECHAZADO', 'EXCEPCION' => 'rechazado por SUNAT',
            default => strtolower((string) $result['sunat']),
        };

        return back()->with(
            'success',
            __('facturacion.documentos.flash.status_synced', [
                'numero' => $felDocument->numero_completo,
                'estado' => $label,
            ]),
        );
    }

    public function sincronizarEstados(
        Request $request,
        FelDocumentStatusSyncService $sync,
    ): RedirectResponse {
        abort_unless($request->user()?->can('documentos.view'), 403);

        $stats = $sync->syncClinic(limit: 200);

        return back()->with(
            'success',
            __('facturacion.documentos.flash.status_synced_bulk', [
                'checked' => $stats['checked'],
                'updated' => $stats['updated'],
                'rejected' => $stats['rejected'],
                'pending' => $stats['pending'],
            ]),
        );
    }

    /**
     * Filtros compartidos entre el listado Inertia y la exportación XLSX.
     *
     * @return array{
     *     search: string,
     *     per_page: int,
     *     sort: string,
     *     sort_valid: bool,
     *     direction: string,
     *     direction_valid: bool,
     *     direction_sql: string,
     *     estado: string,
     *     metodo_pago: string,
     *     fecha_desde: string,
     *     fecha_hasta: string,
     *     documento_filtro_ui: array{default_desde: string, default_hasta: string, fuera_del_mes_actual: bool},
     * }
     */
    private function resolveDocumentosContext(Request $request): array
    {
        $search = trim((string) $request->string('search', ''));
        $perPageRequested = (int) $request->integer('per_page', 15);
        $perPage = in_array($perPageRequested, self::PER_PAGE_OPTIONS, true) ? $perPageRequested : 15;

        $sort = (string) $request->string('sort', '');
        $direction = strtolower((string) $request->string('direction', 'desc'));
        $sortValid = in_array($sort, self::SORTABLE_COLUMNS, true);
        $directionValid = in_array($direction, ['asc', 'desc'], true);
        $directionSql = $directionValid ? $direction : 'desc';

        $estado = (string) $request->string('estado', 'todos');
        if (! in_array($estado, ['todos', FelDocument::ESTADO_EMITIDO, FelDocument::ESTADO_ANULADO, FelDocument::ESTADO_RECHAZADO, FelDocument::ESTADO_PENDIENTE], true)) {
            $estado = 'todos';
        }

        $metodoPago = (string) $request->string('metodo_pago', 'todos');
        if (! in_array($metodoPago, ['todos', ...self::METODOS_PAGO], true)) {
            $metodoPago = 'todos';
        }

        $hoy = now(config('app.timezone'))->toDateString();
        $defaultDesde = $hoy;
        $defaultHasta = $hoy;

        $fechaDesde = $this->parseDateParam($request->query('fecha_desde'));
        $fechaHasta = $this->parseDateParam($request->query('fecha_hasta'));

        if ($fechaDesde === null || $fechaHasta === null) {
            $fechaDesde = $defaultDesde;
            $fechaHasta = $defaultHasta;
            $fueraDelMesActual = false;
        } else {
            if ($fechaDesde > $fechaHasta) {
                [$fechaDesde, $fechaHasta] = [$fechaHasta, $fechaDesde];
            }
            $fueraDelMesActual = ($fechaDesde !== $defaultDesde) || ($fechaHasta !== $defaultHasta);
        }

        return [
            'search' => $search,
            'per_page' => $perPage,
            'sort' => $sort,
            'sort_valid' => $sortValid,
            'direction' => $direction,
            'direction_valid' => $directionValid,
            'direction_sql' => $directionSql,
            'estado' => $estado,
            'metodo_pago' => $metodoPago,
            'fecha_desde' => $fechaDesde,
            'fecha_hasta' => $fechaHasta,
            'documento_filtro_ui' => [
                'default_desde' => $defaultDesde,
                'default_hasta' => $defaultHasta,
                'fuera_del_mes_actual' => $fueraDelMesActual,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return Builder<FelDocument>
     */
    private function buildDocumentosQuery(array $ctx): Builder
    {
        $query = FelDocument::query();

        $search = (string) $ctx['search'];
        if ($search !== '') {
            $like = '%'.addcslashes($search, '%_\\').'%';
            $query->where(function ($q) use ($like): void {
                $q->where('numero_completo', 'ILIKE', $like)
                    ->orWhere('receptor_nombre', 'ILIKE', $like)
                    ->orWhere('receptor_num_doc', 'ILIKE', $like)
                    ->orWhereHas('venta', fn ($vq) => $vq->where('numero', 'ILIKE', $like));
            });
        }

        if ($ctx['estado'] !== 'todos') {
            $query->where('estado', $ctx['estado']);
        }

        $metodoPago = (string) $ctx['metodo_pago'];
        if ($metodoPago !== 'todos') {
            if ($metodoPago === 'otro') {
                $query->where(function ($q): void {
                    $q->whereDoesntHave('venta.pagos')
                        ->orWhereHas('venta.pagos', function ($pq): void {
                            $pq->whereNull('medio')
                                ->orWhere('medio', '')
                                ->orWhereNotIn('medio', array_values(array_diff(self::METODOS_PAGO, ['otro'])));
                        });
                });
            } else {
                $query->whereHas('venta.pagos', fn ($pq) => $pq->where('medio', $metodoPago));
            }
        }

        $query->whereRaw('DATE(COALESCE(emitido_at, created_at)) >= ?', [$ctx['fecha_desde']])
            ->whereRaw('DATE(COALESCE(emitido_at, created_at)) <= ?', [$ctx['fecha_hasta']]);

        if ($ctx['sort_valid']) {
            $query->orderBy((string) $ctx['sort'], (string) $ctx['direction_sql']);
            if ($ctx['sort'] !== 'emitido_at') {
                $query->orderByDesc('emitido_at');
            }
        } else {
            $query->orderByDesc('emitido_at')->orderByDesc('created_at');
        }

        return $query;
    }

    private function authorizeDocument(FelDocument $felDocument): void
    {
        abort_unless(request()->user()?->can('documentos.view'), 403);
    }

    private function proxyLucodeDownload(
        FelDocumentApisunatFileService $lucodeFiles,
        FelDocument $felDocument,
        string $tipo,
        string $filename,
        string $mime,
    ): StreamedResponse|RedirectResponse {
        try {
            $content = $lucodeFiles->descargar($felDocument, RestaurantSetting::current(), $tipo);
        } catch (Throwable $e) {
            return back()->with('error', 'No se pudo descargar el archivo: '.$e->getMessage());
        }

        return response()->streamDownload(
            fn () => print ($content),
            $filename,
            ['Content-Type' => $mime],
        );
    }

    private function parseDateParam(mixed $value): ?string
    {
        if (! is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return null;
        }

        return $value;
    }
}

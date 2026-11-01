import { Head, Link, router } from '@inertiajs/react';
import {
    Banknote,
    CheckCircle2,
    Download,
    Eye,
    Plus,
    Printer,
    Receipt,
    RefreshCw,
    ShoppingCart,
    Tag,
    Wallet,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import {
    DataPagination,
    DataTable,
    EmptyState,
    PageHeader,
    SearchField,
    type DataTableColumn,
} from '@/components/data-page';
import { DateRangeFilter } from '@/components/date-range-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import AppLayout from '@/layouts/app-layout';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import { todayIso } from '../pedidos/types';
import caja from '../caja/caja-routes';
import { VentaCpeDialog } from './components/venta-cpe-dialog';
import { VentaDetalleModal } from './components/venta-detalle-modal';
import { VentaTicketDialog } from './components/venta-ticket-dialog';
import ventas from './ventas-routes';

type PedidoPendiente = {
    id: string;
    numero: number;
    canal: string;
    estado: string;
    total: string | number;
    mesa?: { id: string; codigo: string; nombre: string | null } | null;
    openedBy?: { id: number; name: string } | null;
    opened_by?: { id: number; name: string } | null;
    updated_at: string;
};

type VentaRow = {
    id: string;
    numero: string | null;
    numero_display?: string | null;
    origen: string;
    tipo_comprobante: string;
    fel_estado?: string;
    cpe_numero?: string | null;
    fel_pdf_url?: string | null;
    fel_pdf_a4_url?: string | null;
    fel_enlace_consulta?: string | null;
    cliente_nombre: string | null;
    cliente_documento: string | null;
    estado: string;
    total: string | number;
    created_at: string;
    pedido?: {
        id: string;
        numero: number;
        canal: string;
        mesa?: { id: string; codigo: string; nombre: string | null } | null;
    } | null;
    pagos: { id: string; medio: string; monto: string | number }[];
    createdBy?: { id: number; name: string } | null;
    created_by?: { id: number; name: string } | null;
};

type OpenCpe = {
    venta_id: string;
    tipo_comprobante: string;
    numero_completo: string | null;
    pdf_ticket_url: string | null;
    pdf_a4_url: string | null;
    enlace_consulta: string | null;
};

function esComprobanteSunat(tipo: string): boolean {
    return tipo === 'boleta' || tipo === 'factura';
}

function cpeListo(row: VentaRow): boolean {
    return (
        esComprobanteSunat(row.tipo_comprobante) &&
        row.fel_estado === 'emitido' &&
        Boolean(row.fel_pdf_url || row.fel_enlace_consulta)
    );
}

function felBadgeClass(estado: string | undefined): string {
    switch (estado) {
        case 'emitido':
            return 'text-emerald-700 dark:text-emerald-300';
        case 'pendiente':
            return 'text-sky-700 dark:text-sky-300';
        case 'rechazado':
            return 'text-destructive';
        case 'anulado':
            return 'text-muted-foreground';
        default:
            return 'text-amber-700 dark:text-amber-300';
    }
}

function felLabelKey(estado: string | undefined): string {
    switch (estado) {
        case 'emitido':
            return 'sunat.emitido';
        case 'pendiente':
            return 'sunat.pendiente';
        case 'rechazado':
            return 'sunat.rechazado';
        case 'anulado':
            return 'sunat.anulado';
        default:
            return 'sunat.sin_comprobante';
    }
}

type Vista = 'historial' | 'por_cobrar';

type Props = {
    sesion_abierta: boolean;
    vista: Vista;
    ventas: Paginated<VentaRow>;
    pedidos_pendientes: PedidoPendiente[];
    medios: string[];
    tipos_comprobante: string[];
    ticket_ancho_mm?: string | null;
    open_ticket_id?: string | null;
    open_cpe?: OpenCpe | null;
    filters: {
        sede_id: string | null;
        search: string;
        vista: Vista;
        estado: string;
        medio: string;
        tipo: string;
        desde: string;
        hasta: string;
        per_page: number;
        sort: string | null;
        direction: 'asc' | 'desc' | null;
    };
    stats: {
        pendientes: number;
        monto_total: number;
        ventas: number;
        pagadas: number;
        anuladas: number;
        coincidencias: number;
    };
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

export default function Index({
    sesion_abierta,
    vista: vistaProp,
    ventas: paginated,
    pedidos_pendientes,
    medios,
    tipos_comprobante,
    ticket_ancho_mm,
    open_ticket_id,
    open_cpe,
    filters,
    stats,
}: Props) {
    const { t } = useTranslation(['ventas', 'caja', 'common']);
    const vista = filters.vista ?? vistaProp ?? 'historial';
    const esPorCobrar = vista === 'por_cobrar';
    const [ticketVentaId, setTicketVentaId] = useState<string | null>(null);
    const [detalleVentaId, setDetalleVentaId] = useState<string | null>(null);
    const [cpeOpen, setCpeOpen] = useState(false);
    const [cpePayload, setCpePayload] = useState<OpenCpe | null>(null);
    const [cpeAutoPrint, setCpeAutoPrint] = useState(false);
    const [emitiendoId, setEmitiendoId] = useState<string | null>(null);

    const clearTicketQuery = useCallback(() => {
        const url = new URL(window.location.href);
        if (!url.searchParams.has('ticket')) {
            return;
        }
        url.searchParams.delete('ticket');
        const qs = url.searchParams.toString();
        window.history.replaceState(
            {},
            '',
            `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`,
        );
    }, []);

    useEffect(() => {
        if (open_cpe) {
            setCpePayload(open_cpe);
            setCpeOpen(true);
            setCpeAutoPrint(true);
            clearTicketQuery();
            return;
        }
        if (!open_ticket_id) {
            return;
        }
        setTicketVentaId(open_ticket_id);
        clearTicketQuery();
    }, [open_ticket_id, open_cpe, clearTicketQuery]);

    const abrirCpe = useCallback((row: VentaRow, autoPrint = false) => {
        setCpePayload({
            venta_id: row.id,
            tipo_comprobante: row.tipo_comprobante,
            numero_completo: row.cpe_numero ?? null,
            pdf_ticket_url: row.fel_pdf_url ?? null,
            pdf_a4_url: row.fel_pdf_a4_url ?? null,
            enlace_consulta: row.fel_enlace_consulta ?? null,
        });
        setCpeAutoPrint(autoPrint);
        setCpeOpen(true);
    }, []);

    const imprimirVenta = useCallback(
        (row: VentaRow) => {
            if (cpeListo(row)) {
                abrirCpe(row);
                return;
            }
            setTicketVentaId(row.id);
        },
        [abrirCpe],
    );

    const reintentarCpe = useCallback((ventaId: string) => {
        setEmitiendoId(ventaId);
        router.post(
            ventas.emitirFel(ventaId).url,
            {},
            {
                preserveScroll: true,
                onFinish: () => setEmitiendoId(null),
            },
        );
    }, []);

    const { search, setSearch, isLoading, setPerPage, applyFilter, fetch } =
        useDataTablePage<{
            vista: Vista;
            estado: string;
            medio: string;
            tipo: string;
            desde: string;
            hasta: string;
        }>({
            routeUrl: ventas.index().url,
            initialFilters: {
                ...filters,
                sort: filters.sort,
                direction: filters.direction,
            },
            only: [
                'ventas',
                'pedidos_pendientes',
                'filters',
                'stats',
                'vista',
                'sesion_abierta',
            ],
            errorMessage: t('toast.load_error'),
            storageKey: 'foodsaas.ventas.prefs',
            defaults: { per_page: 15 },
        });

    const exportVentas = useCallback(() => {
        const params = new URLSearchParams();
        if (filters.search) {
            params.set('search', filters.search);
        }
        if (filters.estado && filters.estado !== 'todos') {
            params.set('estado', filters.estado);
        }
        if (filters.medio && filters.medio !== 'todos') {
            params.set('medio', filters.medio);
        }
        if (filters.tipo && filters.tipo !== 'todos') {
            params.set('tipo', filters.tipo);
        }
        if (filters.desde) {
            params.set('desde', filters.desde);
        }
        if (filters.hasta) {
            params.set('hasta', filters.hasta);
        }
        if (filters.sort) {
            params.set('sort', filters.sort);
        }
        if (filters.direction) {
            params.set('direction', filters.direction);
        }
        const qs = params.toString();
        window.location.href = `${ventas.export().url}${qs ? `?${qs}` : ''}`;
    }, [filters]);

    const estadoOptions = useMemo<readonly FilterSelectOption<string>[]>(
        () => [
            { value: 'todos', label: t('filters.estado_todos') },
            {
                value: 'pagada',
                label: t('estado.pagada'),
                tone: 'success',
                icon: <CheckCircle2 className="size-3.5" aria-hidden />,
            },
            {
                value: 'anulada',
                label: t('estado.anulada'),
                tone: 'danger',
                icon: <XCircle className="size-3.5" aria-hidden />,
            },
        ],
        [t],
    );

    const medioOptions = useMemo<readonly FilterSelectOption<string>[]>(
        () => [
            { value: 'todos', label: t('filters.medio_todos') },
            ...medios.map((m) => ({
                value: m,
                label: t(`caja:medios.${m}`),
                tone: 'default' as const,
            })),
        ],
        [medios, t],
    );

    const tipoOptions = useMemo<readonly FilterSelectOption<string>[]>(
        () => [
            { value: 'todos', label: t('filters.tipo_todos') },
            ...tipos_comprobante.map((tipo) => ({
                value: tipo,
                label: t(`tipo.${tipo}`),
                tone: 'info' as const,
            })),
        ],
        [t, tipos_comprobante],
    );

    const ventaColumns = useMemo<DataTableColumn<VentaRow>[]>(
        () => [
            {
                key: 'numero',
                header: t('columns.numero'),
                cell: (row) => {
                    const display =
                        row.numero_display ??
                        row.cpe_numero ??
                        row.numero ??
                        (row.pedido ? `#${row.pedido.numero}` : '—');
                    const interno =
                        row.cpe_numero &&
                        row.numero &&
                        row.cpe_numero !== row.numero
                            ? row.numero
                            : null;

                    return (
                        <div className="min-w-0">
                            <p
                                className="truncate font-medium text-brand-700 tabular-nums"
                                title={interno ?? undefined}
                            >
                                {display}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {t(`origen.${row.origen}`, {
                                    defaultValue: row.origen,
                                })}
                                {interno ? ` · ${interno}` : null}
                            </p>
                        </div>
                    );
                },
            },
            {
                key: 'fecha',
                header: t('columns.fecha'),
                cell: (row) => {
                    const dt = formatPeruDateTime(row.created_at);
                    return (
                        <span className="tabular-nums text-sm text-muted-foreground">
                            {dt.fecha}, {dt.hora}
                        </span>
                    );
                },
                className: 'hidden md:table-cell',
            },
            {
                key: 'cliente',
                header: t('columns.cliente'),
                cell: (row) => (
                    <div className="min-w-0">
                        <p className="truncate font-medium">
                            {row.cliente_nombre?.trim() || 'Varios'}
                        </p>
                        {row.cliente_documento ? (
                            <p className="truncate text-xs text-muted-foreground">
                                {row.cliente_documento}
                            </p>
                        ) : row.pedido?.mesa ? (
                            <p className="truncate text-xs text-muted-foreground">
                                {row.pedido.mesa.nombre?.trim() ||
                                    row.pedido.mesa.codigo}
                            </p>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'total',
                header: t('columns.total'),
                align: 'right',
                cell: (row) => (
                    <span className="font-semibold tabular-nums">
                        {money(row.total)}
                    </span>
                ),
            },
            {
                key: 'metodo',
                header: t('columns.metodo'),
                cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                        {row.pagos.length === 0
                            ? '—'
                            : row.pagos
                                  .map((p) => t(`caja:medios.${p.medio}`))
                                  .join(' · ')}
                    </span>
                ),
                className: 'hidden lg:table-cell',
            },
            {
                key: 'estado',
                header: t('columns.estado'),
                cell: (row) => (
                    <Badge
                        variant={
                            row.estado === 'anulada' ? 'destructive' : 'default'
                        }
                        className={cn(
                            row.estado === 'pagada' &&
                                'border-transparent bg-emerald-600/90 text-white',
                        )}
                    >
                        {t(`estado.${row.estado}`, {
                            defaultValue: row.estado,
                        })}
                    </Badge>
                ),
            },
            {
                key: 'comprobante',
                header: t('columns.comprobante'),
                cell: (row) => {
                    const esSunat = esComprobanteSunat(row.tipo_comprobante);
                    const estado = row.fel_estado ?? 'sin_cpe';

                    return (
                        <div className="flex min-w-0 flex-col justify-center gap-0.5 leading-tight">
                            <span className="text-sm font-medium">
                                {row.cpe_numero ??
                                    t(`tipo.${row.tipo_comprobante}`, {
                                        defaultValue: row.tipo_comprobante,
                                    })}
                            </span>
                            {esSunat ? (
                                <span
                                    className={cn(
                                        'text-[11px]',
                                        felBadgeClass(estado),
                                    )}
                                >
                                    {t(felLabelKey(estado))}
                                </span>
                            ) : (
                                <span className="text-[11px] text-muted-foreground">
                                    {t('tipo.ticket')}
                                </span>
                            )}
                        </div>
                    );
                },
                className: 'hidden align-middle md:table-cell',
            },
            {
                key: 'acciones',
                header: (
                    <span className="sr-only">{t('columns.acciones')}</span>
                ),
                align: 'right',
                cell: (row) => {
                    const listo = cpeListo(row);
                    const puedeReemitir =
                        esComprobanteSunat(row.tipo_comprobante) &&
                        (row.fel_estado === 'sin_cpe' ||
                            row.fel_estado === 'rechazado') &&
                        row.estado === 'pagada';
                    const printLabel = listo
                        ? t('actions_extra.imprimir_cpe')
                        : t('actions.imprimir_ticket');

                    return (
                        <div className="flex items-center justify-end gap-0.5">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 cursor-pointer border-0 bg-transparent text-violet-600 shadow-none hover:bg-violet-500/10 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                                onClick={() => setDetalleVentaId(row.id)}
                                aria-label={t('actions.ver_detalle')}
                                title={t('actions.ver_detalle')}
                            >
                                <Eye
                                    className="size-4"
                                    strokeWidth={2.25}
                                    aria-hidden
                                />
                            </Button>
                            {puedeReemitir ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0 cursor-pointer border-0 bg-transparent text-amber-600 shadow-none hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400"
                                    disabled={emitiendoId === row.id}
                                    onClick={() => reintentarCpe(row.id)}
                                    aria-label={t('actions_extra.reintentar_cpe')}
                                    title={t('actions_extra.reintentar_cpe')}
                                >
                                    <RefreshCw
                                        className={cn(
                                            'size-4',
                                            emitiendoId === row.id &&
                                                'animate-spin',
                                        )}
                                        strokeWidth={2.25}
                                        aria-hidden
                                    />
                                </Button>
                            ) : null}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 cursor-pointer border-0 bg-transparent text-sky-600 shadow-none hover:bg-sky-500/10 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                                onClick={() => imprimirVenta(row)}
                                aria-label={printLabel}
                                title={printLabel}
                            >
                                <Printer
                                    className="size-4"
                                    strokeWidth={2.25}
                                    aria-hidden
                                />
                            </Button>
                        </div>
                    );
                },
                className: 'w-24',
            },
        ],
        [t, emitiendoId, imprimirVenta, reintentarCpe],
    );

    const pedidoColumns = useMemo<DataTableColumn<PedidoPendiente>[]>(
        () => [
            {
                key: 'pedido',
                header: t('columns.pedido'),
                cell: (p) => (
                    <span className="font-medium text-brand-700 tabular-nums">
                        #{p.numero}
                    </span>
                ),
            },
            {
                key: 'mesa',
                header: t('columns.mesa'),
                cell: (p) => (
                    <span className="text-sm">
                        {p.mesa?.nombre?.trim() || p.mesa?.codigo || '—'}
                    </span>
                ),
            },
            {
                key: 'mesero',
                header: t('columns.mesero'),
                cell: (p) => (
                    <span className="text-sm text-muted-foreground">
                        {p.openedBy?.name ?? p.opened_by?.name ?? '—'}
                    </span>
                ),
                className: 'hidden md:table-cell',
            },
            {
                key: 'total',
                header: t('columns.total'),
                align: 'right',
                cell: (p) => (
                    <span className="font-semibold tabular-nums">
                        {money(p.total)}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: (
                    <span className="sr-only">{t('columns.acciones')}</span>
                ),
                align: 'right',
                cell: (p) => (
                    <Can
                        permission={[
                            'ventas.create',
                            'caja.cobrar',
                            'pedidos.cobrar',
                        ]}
                    >
                        {sesion_abierta ? (
                            <Button
                                type="button"
                                size="sm"
                                className="cursor-pointer gap-1.5"
                                asChild
                            >
                                <Link href={ventas.desdePedido(p.id).url}>
                                    <Wallet className="size-4" aria-hidden />
                                    {t('actions.cobrar')}
                                </Link>
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                className="cursor-pointer gap-1.5"
                                onClick={() =>
                                    router.visit(caja.index().url)
                                }
                            >
                                <Wallet className="size-4" aria-hidden />
                                {t('actions.cobrar')}
                            </Button>
                        )}
                    </Can>
                ),
                className: 'w-36',
            },
        ],
        [sesion_abierta, t],
    );

    return (
        <>
            <Head title={t('title')} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('description')}
                    stats={[
                        {
                            label: t('stats.monto_total'),
                            value: money(stats.monto_total),
                            variant: 'success',
                            icon: Banknote,
                        },
                        {
                            label: t('stats.ventas'),
                            value: stats.ventas,
                            variant: 'info',
                            icon: Receipt,
                            onClick: () =>
                                applyFilter({
                                    vista: 'historial',
                                    estado: 'todos',
                                }),
                        },
                        {
                            label: t('stats.pagadas'),
                            value: stats.pagadas,
                            variant: 'success',
                            icon: CheckCircle2,
                            onClick: () =>
                                applyFilter({
                                    vista: 'historial',
                                    estado: 'pagada',
                                }),
                            hideOnMobile: true,
                        },
                        {
                            label: t('stats.anuladas'),
                            value: stats.anuladas,
                            variant: stats.anuladas > 0 ? 'danger' : 'muted',
                            icon: XCircle,
                            onClick: () =>
                                applyFilter({
                                    vista: 'historial',
                                    estado: 'anulada',
                                }),
                            hideOnMobile: true,
                        },
                        {
                            label: t('stats.pendientes'),
                            value: stats.pendientes,
                            variant:
                                stats.pendientes > 0 ? 'warning' : 'success',
                            icon: ShoppingCart,
                            onClick: () =>
                                applyFilter({ vista: 'por_cobrar' }),
                        },
                        {
                            label: t('stats.coincidencias'),
                            value: stats.coincidencias,
                            variant: 'primary',
                            icon: Tag,
                        },
                    ]}
                    action={
                        <div className="flex flex-wrap justify-end gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => fetch()}
                                        disabled={isLoading}
                                        className="cursor-pointer"
                                        aria-label={t('common:actions.reload', {
                                            defaultValue: 'Actualizar',
                                        })}
                                    >
                                        <RefreshCw
                                            className={cn(
                                                'size-4',
                                                isLoading && 'animate-spin',
                                            )}
                                        />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {t('common:actions.reload', {
                                        defaultValue: 'Actualizar',
                                    })}
                                </TooltipContent>
                            </Tooltip>

                            <Can
                                permission={[
                                    'ventas.export',
                                    'ventas.view',
                                    'caja.view',
                                ]}
                            >
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="export"
                                            className="cursor-pointer gap-2"
                                            onClick={exportVentas}
                                            disabled={esPorCobrar}
                                        >
                                            <Download
                                                className="size-4"
                                                aria-hidden
                                            />
                                            <span className="hidden sm:inline">
                                                {t('actions.export')}
                                            </span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        {t('actions.export')}
                                    </TooltipContent>
                                </Tooltip>
                            </Can>

                            <Can
                                permission={[
                                    'ventas.create',
                                    'caja.cobrar',
                                    'pedidos.cobrar',
                                ]}
                            >
                                <Button
                                    type="button"
                                    className="cursor-pointer gap-2"
                                    asChild
                                >
                                    <Link
                                        href={
                                            sesion_abierta
                                                ? ventas.create().url
                                                : caja.index().url
                                        }
                                    >
                                        <Plus className="size-4" aria-hidden />
                                        <span className="hidden sm:inline">
                                            {t('actions.nueva')}
                                        </span>
                                    </Link>
                                </Button>
                            </Can>
                        </div>
                    }
                />

                {!sesion_abierta ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-amber-950 dark:text-amber-100">
                            <strong>{t('caja_cerrada')}</strong>
                            {' — '}
                            {t('caja_cerrada_hint')}
                        </p>
                        <Can permission="caja.abrir">
                            <Button type="button" size="sm" asChild>
                                <Link href={caja.index().url}>{t('ir_caja')}</Link>
                            </Button>
                        </Can>
                    </div>
                ) : null}

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {!esPorCobrar ? (
                            <>
                                <FilterSelect
                                    ariaLabel={t('filters.estado_label')}
                                    value={filters.estado}
                                    onChange={(estado) =>
                                        applyFilter({ estado })
                                    }
                                    options={estadoOptions}
                                    disabled={isLoading}
                                />
                                <FilterSelect
                                    ariaLabel={t('filters.medio_label')}
                                    value={filters.medio}
                                    onChange={(medio) =>
                                        applyFilter({ medio })
                                    }
                                    options={medioOptions}
                                    disabled={isLoading}
                                />
                                <FilterSelect
                                    ariaLabel={t('filters.tipo_label')}
                                    value={filters.tipo}
                                    onChange={(tipo) => applyFilter({ tipo })}
                                    options={tipoOptions}
                                    disabled={isLoading}
                                />
                                <DateRangeFilter
                                    desde={filters.desde}
                                    hasta={filters.hasta}
                                    disabled={isLoading}
                                    onApply={(desde, hasta) =>
                                        applyFilter({ desde, hasta })
                                    }
                                    onClear={() => {
                                        const day = todayIso();
                                        applyFilter({
                                            desde: day,
                                            hasta: day,
                                        });
                                    }}
                                />
                            </>
                        ) : null}
                    </div>
                    <SearchField
                        value={search}
                        onValueChange={setSearch}
                        placeholder={
                            esPorCobrar
                                ? t('filters.search_pedidos')
                                : t('filters.search')
                        }
                        isSearching={isLoading}
                        className="w-full sm:w-72"
                    />
                </div>

                {esPorCobrar ? (
                    <DataTable
                        columns={pedidoColumns}
                        data={pedidos_pendientes}
                        rowKey={(row) => row.id}
                        isLoading={isLoading}
                        emptyState={
                            <EmptyState
                                icon={ShoppingCart}
                                title={
                                    filters.search
                                        ? t('empty.no_results_title')
                                        : t('empty.pendientes')
                                }
                                description={
                                    filters.search
                                        ? t('empty.no_results_description')
                                        : t('empty.pendientes_hint')
                                }
                            />
                        }
                    />
                ) : (
                    <DataTable
                        columns={ventaColumns}
                        data={paginated.data}
                        rowKey={(row) => row.id}
                        isLoading={isLoading}
                        footer={
                            <DataPagination
                                meta={paginated}
                                onPerPageChange={setPerPage}
                                preservedQuery={{
                                    search: filters.search || undefined,
                                    per_page: filters.per_page,
                                    vista: filters.vista,
                                    estado:
                                        filters.estado !== 'todos'
                                            ? filters.estado
                                            : undefined,
                                    medio:
                                        filters.medio !== 'todos'
                                            ? filters.medio
                                            : undefined,
                                    tipo:
                                        filters.tipo !== 'todos'
                                            ? filters.tipo
                                            : undefined,
                                    desde: filters.desde || undefined,
                                    hasta: filters.hasta || undefined,
                                }}
                            />
                        }
                        emptyState={
                            <EmptyState
                                icon={Receipt}
                                title={
                                    filters.search ||
                                    filters.estado !== 'todos' ||
                                    filters.medio !== 'todos'
                                        ? t('empty.no_results_title')
                                        : t('empty.ventas')
                                }
                                description={
                                    filters.search ||
                                    filters.estado !== 'todos' ||
                                    filters.medio !== 'todos'
                                        ? t('empty.no_results_description')
                                        : t('empty.ventas_hint')
                                }
                            />
                        }
                    />
                )}
            </div>

            <VentaDetalleModal
                open={detalleVentaId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDetalleVentaId(null);
                    }
                }}
                ventaId={detalleVentaId}
                onImprimir={(id) => {
                    setDetalleVentaId(null);
                    const row = paginated.data.find((v) => v.id === id);
                    if (row) {
                        imprimirVenta(row);
                        return;
                    }
                    setTicketVentaId(id);
                }}
                onImprimirCpe={(payload) => {
                    setDetalleVentaId(null);
                    setCpePayload(payload);
                    setCpeAutoPrint(false);
                    setCpeOpen(true);
                }}
                onEmitirCpe={(id) => {
                    setDetalleVentaId(null);
                    reintentarCpe(id);
                }}
            />

            <VentaTicketDialog
                open={ticketVentaId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setTicketVentaId(null);
                    }
                }}
                ventaId={ticketVentaId}
                defaultAncho={ticket_ancho_mm}
            />

            <VentaCpeDialog
                open={cpeOpen}
                onOpenChange={(open) => {
                    setCpeOpen(open);
                    if (!open) {
                        setCpePayload(null);
                        setCpeAutoPrint(false);
                    }
                }}
                numeroCompleto={cpePayload?.numero_completo}
                tipoComprobante={cpePayload?.tipo_comprobante}
                pdfTicketUrl={cpePayload?.pdf_ticket_url}
                pdfA4Url={cpePayload?.pdf_a4_url}
                enlaceConsulta={cpePayload?.enlace_consulta}
                autoPrint={cpeAutoPrint}
                onAutoPrintConsumed={() => setCpeAutoPrint(false)}
            />
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Ventas', href: '/ventas' },
        ]}
    >
        {page}
    </AppLayout>
);

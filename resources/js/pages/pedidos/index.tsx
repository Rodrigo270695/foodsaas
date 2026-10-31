import { Head, Link } from '@inertiajs/react';
import {
    CheckCircle2,
    ClipboardList,
    CookingPot,
    History,
    MoreHorizontal,
    Plus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DataPagination,
    DataTable,
    EmptyState,
    PageHeader,
    type DataTableColumn,
} from '@/components/data-page';
import { Can } from '@/components/can';
import { DateRangeFilter } from '@/components/date-range-filter';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import { PedidoFormModal } from './components/pedido-form-modal';
import pedidos from './pedidos-routes';

type MesaLibre = {
    id: string;
    codigo: string;
    nombre: string | null;
    capacidad: number;
};

type PedidoRow = {
    id: string;
    numero: number;
    estado: string;
    canal: string;
    total: string | number;
    created_at: string;
    cerrado_at?: string | null;
    mesa?: { id: string; codigo: string; nombre: string | null } | null;
};

type Props = {
    pedidos: Paginated<PedidoRow>;
    mesas_libres: MesaLibre[];
    filters: {
        estado: string;
        desde: string | null;
        hasta: string | null;
        sede_id: string | null;
    };
    stats: { activos: number; en_cola: number; cerrados_hoy: number };
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

function formatFechaHora(iso: string): { fecha: string; hora: string } {
    const d = new Date(iso);
    return {
        fecha: d.toLocaleDateString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }),
        hora: d.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
        }),
    };
}

function estadoTone(estado: string): string {
    switch (estado) {
        case 'borrador':
            return 'bg-muted text-muted-foreground';
        case 'abierto':
            return 'bg-amber-500/15 text-amber-800 dark:text-amber-300';
        case 'cerrado':
            return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300';
        case 'anulado':
            return 'bg-rose-500/15 text-rose-800 dark:text-rose-300';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

export default function Index({
    pedidos: paginated,
    mesas_libres,
    filters,
    stats,
}: Props) {
    const { t } = useTranslation(['pedidos', 'common']);
    const { can } = usePermission();
    const [openNew, setOpenNew] = useState(false);
    const isHistorico =
        filters.estado === 'historico' ||
        filters.estado === 'cerrados' ||
        filters.estado === 'anulados';

    const { isLoading, setPerPage, applyFilter } = useDataTablePage<{
        estado: string;
        desde: string | null;
        hasta: string | null;
    }>({
        routeUrl: pedidos.index().url,
        initialFilters: {
            ...filters,
            sort: null,
            direction: null,
        },
        only: ['pedidos', 'filters', 'stats', 'mesas_libres'],
        errorMessage: t('toast.load_error'),
        storageKey: 'foodsaas.pedidos.prefs',
        defaults: { per_page: 20 },
    });

    const showDateRange =
        isHistorico ||
        filters.estado === 'todos' ||
        filters.estado === 'cerrados' ||
        filters.estado === 'anulados';

    const todayIso = () => new Date().toISOString().slice(0, 10);

    const estadoOptions = useMemo<readonly FilterSelectOption<string>[]>(
        () => [
            { value: 'activos', label: t('filters.activos'), tone: 'warning' },
            {
                value: 'historico',
                label: t('filters.historico', { defaultValue: 'Histórico' }),
                tone: 'info',
            },
            {
                value: 'cerrados',
                label: t('filters.cerrados'),
                tone: 'success',
            },
            {
                value: 'anulados',
                label: t('filters.anulados'),
                tone: 'danger',
            },
            { value: 'todos', label: t('filters.todos') },
        ],
        [t],
    );

    const columns = useMemo<DataTableColumn<PedidoRow>[]>(
        () => [
            {
                key: 'numero',
                header: t('columns.numero'),
                cell: (row) => (
                    <Link
                        href={pedidos.show(row.id).url}
                        className="font-semibold text-[#660033] hover:underline"
                    >
                        #{row.numero}
                    </Link>
                ),
            },
            {
                key: 'mesa',
                header: t('columns.mesa'),
                cell: (row) =>
                    row.mesa
                        ? row.mesa.nombre?.trim() || row.mesa.codigo
                        : t(`canal.${row.canal}`),
            },
            {
                key: 'estado',
                header: t('columns.estado'),
                cell: (row) => (
                    <span
                        className={cn(
                            'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                            estadoTone(row.estado),
                        )}
                    >
                        {t(`estado.${row.estado}`)}
                    </span>
                ),
            },
            {
                key: 'total',
                header: t('columns.total'),
                cell: (row) => (
                    <span className="font-medium tabular-nums">
                        {money(row.total)}
                    </span>
                ),
            },
            {
                key: 'fecha',
                header: t('columns.fecha', { defaultValue: 'Fecha' }),
                cell: (row) => {
                    const { fecha, hora } = formatFechaHora(row.created_at);
                    return (
                        <div className="leading-tight">
                            <p className="text-sm tabular-nums">{fecha}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                                {hora}
                            </p>
                        </div>
                    );
                },
            },
            {
                key: 'actions',
                header: '',
                align: 'right',
                cell: (row) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={pedidos.show(row.id).url}>
                                    {t('actions.open')}
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
            },
        ],
        [t],
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
                            label: t('stats.activos'),
                            value: stats.activos,
                            variant: 'warning',
                            icon: ClipboardList,
                        },
                        {
                            label: t('stats.en_cola'),
                            value: stats.en_cola,
                            variant: 'info',
                            icon: CookingPot,
                        },
                        {
                            label: t('stats.cerrados_hoy', {
                                defaultValue: 'Cerrados hoy',
                            }),
                            value: stats.cerrados_hoy,
                            variant: 'success',
                            icon: CheckCircle2,
                        },
                    ]}
                    action={
                        <Can permission="pedidos.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setOpenNew(true)}
                            >
                                <Plus className="size-4" />
                                <span className="hidden sm:inline">
                                    {t('actions.new')}
                                </span>
                                <span className="sm:hidden">
                                    {t('actions.new_short')}
                                </span>
                            </Button>
                        </Can>
                    }
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <FilterSelect
                        ariaLabel={t('filters.estado')}
                        value={filters.estado}
                        onChange={(estado) => {
                            if (estado === 'historico') {
                                const day = todayIso();
                                applyFilter({
                                    estado,
                                    desde: filters.desde ?? day,
                                    hasta: filters.hasta ?? day,
                                });
                                return;
                            }
                            if (estado === 'activos') {
                                applyFilter({
                                    estado,
                                    desde: null,
                                    hasta: null,
                                });
                                return;
                            }
                            applyFilter({ estado });
                        }}
                        options={estadoOptions}
                        disabled={isLoading}
                    />

                    {showDateRange ? (
                        <DateRangeFilter
                            desde={filters.desde}
                            hasta={filters.hasta}
                            disabled={isLoading}
                            onApply={(desde, hasta) =>
                                applyFilter({ desde, hasta })
                            }
                            onClear={() => {
                                if (filters.estado === 'historico') {
                                    const day = todayIso();
                                    applyFilter({ desde: day, hasta: day });
                                    return;
                                }
                                applyFilter({ desde: null, hasta: null });
                            }}
                        />
                    ) : null}

                    {filters.estado === 'historico' ? (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <History className="size-3.5 shrink-0" />
                            {t('filters.historico_hint', {
                                defaultValue:
                                    'Cobrados y anulados en el rango elegido.',
                            })}
                        </p>
                    ) : null}
                </div>

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(row) => row.id}
                    isLoading={isLoading}
                    footer={
                        <DataPagination
                            meta={paginated}
                            onPerPageChange={setPerPage}
                            preservedQuery={{
                                estado: filters.estado,
                                desde: filters.desde || undefined,
                                hasta: filters.hasta || undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={isHistorico ? History : ClipboardList}
                            title={
                                isHistorico
                                    ? t('empty.historico_title', {
                                          defaultValue:
                                              'Sin pedidos en esta fecha',
                                      })
                                    : t('empty.title')
                            }
                            description={
                                isHistorico
                                    ? t('empty.historico_description', {
                                          defaultValue:
                                              'Cambia la fecha o cobra un pedido para verlo aquí.',
                                      })
                                    : t('empty.description')
                            }
                            action={
                                !isHistorico && can('pedidos.create') ? (
                                    <Button
                                        type="button"
                                        onClick={() => setOpenNew(true)}
                                    >
                                        <Plus className="size-4" />
                                        {t('actions.new')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <PedidoFormModal
                open={openNew}
                onOpenChange={setOpenNew}
                mesasLibres={mesas_libres}
            />
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Pedidos', href: '/pedidos' },
        ]}
    >
        {page}
    </AppLayout>
);

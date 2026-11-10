import { Head, Link } from '@inertiajs/react';
import {
    Bike,
    CheckCircle2,
    ClipboardList,
    Filter,
    Plus,
    ScreenShare,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    PageHeader,
    type DataTableColumn,
} from '@/components/data-page';
import { DateRangeFilter } from '@/components/date-range-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';
import type { Paginated } from '@/types';
import { todayIso } from '../pedidos/types';
import { DeliveryFormModal } from './components/delivery-form-modal';

type PedidoRow = {
    id: string;
    numero: number;
    estado: string;
    comensales: number;
    notas: string | null;
    total: string | number;
    lineas_pendientes_count: number;
    lineas_cola_count: number;
    opened_by: string | null;
    created_at: string | null;
};

type Props = {
    pedidos: Paginated<PedidoRow>;
    filters: {
        search: string;
        estado: string;
        desde: string;
        hasta: string;
        per_page: number;
        sort: string | null;
        direction: 'asc' | 'desc' | null;
    };
    stats: {
        activos: number;
        hoy: number;
        filtros: number;
        coincidencias: number;
    };
};

function money(value: string | number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(Number(value));
}

export default function DeliveryIndex({ pedidos, filters, stats }: Props) {
    const { t } = useTranslation(['delivery', 'common']);
    const canCreate = usePermission('delivery.create');
    const [openNew, setOpenNew] = useState(false);

    const { search, setSearch, isLoading, setPerPage, applyFilter } =
        useDataTablePage<{
            estado: string;
            desde: string;
            hasta: string;
        }>({
            routeUrl: '/delivery',
            initialFilters: filters,
            only: ['pedidos', 'filters', 'stats'],
            errorMessage: t('delivery:toast.load_error'),
            storageKey: 'foodsaas.delivery.prefs',
            defaults: { per_page: 15 },
        });

    const estadoOptions = useMemo<FilterSelectOption[]>(
        () => [
            {
                value: 'activos',
                label: t('delivery:filters.activos'),
                tone: 'warning',
            },
            {
                value: 'historico',
                label: t('delivery:filters.historico'),
                tone: 'info',
            },
            { value: 'todos', label: t('delivery:filters.todos') },
        ],
        [t],
    );

    const columns = useMemo<DataTableColumn<PedidoRow>[]>(
        () => [
            {
                id: 'numero',
                header: t('delivery:columns.pedido'),
                cell: (row) => (
                    <div className="min-w-0">
                        <Link
                            href={`/pedidos/${row.id}`}
                            className="font-semibold text-brand-600 hover:underline"
                        >
                            #{row.numero}
                        </Link>
                        <p className="text-muted-foreground text-xs capitalize">
                            {row.estado}
                        </p>
                    </div>
                ),
            },
            {
                id: 'detalle',
                header: t('delivery:columns.detalle'),
                cell: (row) => (
                    <div className="max-w-xs truncate text-sm">
                        {row.notas || '—'}
                    </div>
                ),
            },
            {
                id: 'cocina',
                header: t('delivery:columns.cocina'),
                cell: (row) => (
                    <div className="flex flex-wrap gap-1">
                        {row.lineas_pendientes_count > 0 ? (
                            <Badge variant="secondary">
                                {row.lineas_pendientes_count} pend.
                            </Badge>
                        ) : null}
                        {row.lineas_cola_count > 0 ? (
                            <Badge variant="outline">
                                {row.lineas_cola_count} cocina
                            </Badge>
                        ) : null}
                        {row.lineas_pendientes_count === 0 &&
                        row.lineas_cola_count === 0
                            ? '—'
                            : null}
                    </div>
                ),
            },
            {
                id: 'total',
                header: t('delivery:columns.total'),
                cell: (row) => money(row.total),
                className: 'text-right font-medium',
            },
            {
                id: 'hora',
                header: t('delivery:columns.hora'),
                cell: (row) => {
                    if (!row.created_at) {
                        return '—';
                    }
                    const dt = formatPeruDateTime(row.created_at);
                    return (
                        <span className="tabular-nums text-sm text-muted-foreground">
                            {dt.fecha}, {dt.hora}
                        </span>
                    );
                },
            },
            {
                id: 'acciones',
                header: '',
                cell: (row) => (
                    <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        asChild
                    >
                        <Link href={`/pedidos/${row.id}`}>
                            {t('delivery:actions.open')}
                        </Link>
                    </Button>
                ),
                className: 'text-right',
            },
        ],
        [t],
    );

    return (
        <>
            <Head title={t('delivery:title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('delivery:title')}
                    description={t('delivery:description')}
                    stats={[
                        {
                            icon: Bike,
                            label: t('delivery:stats.activos'),
                            value: stats.activos,
                            variant: 'primary',
                            onClick: () =>
                                applyFilter({
                                    estado: 'activos',
                                    desde: todayIso(),
                                    hasta: todayIso(),
                                }),
                        },
                        {
                            icon: CheckCircle2,
                            label: t('delivery:stats.hoy'),
                            value: stats.hoy,
                            variant: 'success',
                            onClick: () => {
                                const day = todayIso();
                                applyFilter({
                                    desde: day,
                                    hasta: day,
                                });
                            },
                        },
                        {
                            icon: Filter,
                            label: t('delivery:stats.filtros'),
                            value: stats.filtros,
                            variant: 'warning',
                        },
                        {
                            icon: ScreenShare,
                            label: t('delivery:stats.coincidencias'),
                            value: stats.coincidencias,
                            variant: 'info',
                        },
                    ]}
                    action={
                        <Can permission="delivery.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setOpenNew(true)}
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">
                                    {t('delivery:actions.new')}
                                </span>
                                <span className="sm:hidden">
                                    {t('delivery:actions.new_short')}
                                </span>
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={pedidos.data}
                    rowKey={(row) => row.id}
                    isLoading={isLoading}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder={t('delivery:search_placeholder')}
                        >
                            <FilterSelect
                                ariaLabel={t('delivery:filters.label')}
                                value={filters.estado}
                                onChange={(estado) => applyFilter({ estado })}
                                options={estadoOptions}
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
                        </DataToolbar>
                    }
                    footer={
                        <DataPagination
                            meta={pedidos}
                            onPerPageChange={setPerPage}
                            preservedQuery={{
                                search: filters.search || undefined,
                                estado: filters.estado,
                                desde: filters.desde,
                                hasta: filters.hasta,
                                per_page: filters.per_page,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={ClipboardList}
                            title={t('delivery:empty.title')}
                            description={t('delivery:empty.description')}
                            action={
                                canCreate ? (
                                    <Button
                                        className="cursor-pointer gap-2"
                                        onClick={() => setOpenNew(true)}
                                    >
                                        <Plus className="size-4" />
                                        {t('delivery:actions.create_first')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <DeliveryFormModal open={openNew} onOpenChange={setOpenNew} />
        </>
    );
}

DeliveryIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Servicio' },
            { title: 'Delivery', href: '/delivery' },
        ]}
    >
        {page}
    </AppLayout>
);

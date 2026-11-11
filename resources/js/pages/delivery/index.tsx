import { Head, Link, router } from '@inertiajs/react';
import {
    Bike,
    CheckCircle2,
    ClipboardList,
    ExternalLink,
    MapPin,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';
import type { Paginated } from '@/types';
import { todayIso } from '../pedidos/types';
import { DeliveryFormModal } from './components/delivery-form-modal';
import { DeliveryZonaModal } from './components/delivery-zona-modal';

type PedidoRow = {
    id: string;
    numero: number;
    estado: string;
    delivery_estado: string | null;
    delivery_nombre: string | null;
    delivery_telefono: string | null;
    delivery_direccion: string | null;
    delivery_tarifa: number;
    zona: string | null;
    comensales: number;
    notas: string | null;
    total: string | number;
    lineas_pendientes_count: number;
    lineas_cola_count: number;
    opened_by: string | null;
    created_at: string | null;
};

type ZonaRow = {
    id: string;
    nombre: string;
    tarifa: string | number;
    activa: boolean;
    orden: number;
};

type Props = {
    pedidos: Paginated<PedidoRow>;
    zonas: ZonaRow[];
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
        en_camino: number;
        filtros: number;
        coincidencias: number;
    };
};

const DELIVERY_ESTADOS = [
    'recibido',
    'preparando',
    'listo',
    'en_camino',
    'entregado',
] as const;

function money(value: string | number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(Number(value));
}

export default function DeliveryIndex({
    pedidos,
    zonas,
    filters,
    stats,
}: Props) {
    const { t } = useTranslation(['delivery', 'common']);
    const canCreate = usePermission('delivery.create');
    const canUpdate = usePermission('delivery.update');
    const [openNew, setOpenNew] = useState(false);
    const [openZona, setOpenZona] = useState(false);

    const { search, setSearch, isLoading, setPerPage, applyFilter } =
        useDataTablePage<{
            estado: string;
            desde: string;
            hasta: string;
        }>({
            routeUrl: '/delivery',
            initialFilters: filters,
            only: ['pedidos', 'filters', 'stats', 'zonas'],
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

    const setDeliveryEstado = (pedidoId: string, delivery_estado: string) => {
        router.patch(
            `/delivery/${pedidoId}/estado`,
            { delivery_estado },
            { preserveScroll: true },
        );
    };

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
                id: 'cliente',
                header: t('delivery:columns.cliente'),
                cell: (row) => (
                    <div className="max-w-xs text-sm">
                        <p className="font-medium">
                            {row.delivery_nombre || '—'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {row.delivery_direccion || row.notas || '—'}
                        </p>
                        {row.zona ? (
                            <p className="text-[11px] text-muted-foreground">
                                {row.zona}
                                {row.delivery_tarifa > 0
                                    ? ` · ${money(row.delivery_tarifa)}`
                                    : ''}
                            </p>
                        ) : null}
                    </div>
                ),
            },
            {
                id: 'delivery_estado',
                header: t('delivery:columns.estado_delivery'),
                cell: (row) =>
                    canUpdate ? (
                        <Select
                            value={row.delivery_estado || 'recibido'}
                            onValueChange={(v) =>
                                setDeliveryEstado(row.id, v)
                            }
                        >
                            <SelectTrigger className="h-8 w-[8.5rem] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DELIVERY_ESTADOS.map((e) => (
                                    <SelectItem key={e} value={e}>
                                        {t(`delivery:estados.${e}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Badge variant="secondary" className="capitalize">
                            {row.delivery_estado
                                ? t(`delivery:estados.${row.delivery_estado}`)
                                : '—'}
                        </Badge>
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
                    <div className="flex justify-end gap-0.5">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 cursor-pointer border-0 bg-transparent text-violet-600 shadow-none hover:bg-violet-500/10 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                            asChild
                        >
                            <Link
                                href={`/pedidos/${row.id}`}
                                aria-label={t('delivery:actions.open')}
                                title={t('delivery:actions.open')}
                            >
                                <ExternalLink
                                    className="size-4"
                                    strokeWidth={2.25}
                                    aria-hidden
                                />
                            </Link>
                        </Button>
                    </div>
                ),
                className: 'text-right',
            },
        ],
        [t, canUpdate],
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
                            icon: MapPin,
                            label: t('delivery:stats.en_camino'),
                            value: stats.en_camino,
                            variant: 'warning',
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
                            icon: ScreenShare,
                            label: t('delivery:stats.coincidencias'),
                            value: stats.coincidencias,
                            variant: 'info',
                        },
                    ]}
                    action={
                        <div className="flex flex-wrap gap-2">
                            <Can permission="delivery.update">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="cursor-pointer gap-2"
                                    onClick={() => setOpenZona(true)}
                                >
                                    <MapPin className="size-4" />
                                    <span className="hidden sm:inline">
                                        {t('delivery:zonas.create')}
                                    </span>
                                </Button>
                            </Can>
                            <Can permission="delivery.create">
                                <Button
                                    type="button"
                                    className="cursor-pointer gap-2"
                                    onClick={() => setOpenNew(true)}
                                >
                                    <Plus
                                        className="size-4"
                                        strokeWidth={2.5}
                                    />
                                    <span className="hidden sm:inline">
                                        {t('delivery:actions.new')}
                                    </span>
                                    <span className="sm:hidden">
                                        {t('delivery:actions.new_short')}
                                    </span>
                                </Button>
                            </Can>
                        </div>
                    }
                />

                {zonas.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {zonas.map((z) => (
                            <Badge
                                key={z.id}
                                variant={z.activa ? 'secondary' : 'outline'}
                                className="gap-1"
                            >
                                <MapPin className="size-3" />
                                {z.nombre} · {money(z.tarifa)}
                            </Badge>
                        ))}
                    </div>
                ) : null}

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

            <DeliveryFormModal
                open={openNew}
                onOpenChange={setOpenNew}
                zonas={zonas}
            />
            <DeliveryZonaModal open={openZona} onOpenChange={setOpenZona} />
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

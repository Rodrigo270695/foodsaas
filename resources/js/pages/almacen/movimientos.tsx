import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Download,
    Package,
    ScrollText,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DataPagination,
    DataTable,
    EmptyState,
    PageHeader,
    SearchField,
    StatBadge,
    type DataTableColumn,
} from '@/components/data-page';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types';
import almacen from './almacen-routes';
import type { MovimientoInventario } from './types';

type MovimientoRow = MovimientoInventario & {
    producto?: {
        id: string;
        nombre: string;
        codigo: string | null;
    } | null;
};

type Filters = {
    search: string;
    tipo: string;
    per_page: number;
};

type Props = {
    movimientos: Paginated<MovimientoRow>;
    filters: Filters;
    stats: { total: number; coincidencias: number };
};

const TIPOS = [
    'todos',
    'entrada',
    'salida',
    'ajuste',
    'merma',
    'venta',
] as const;

export default function Movimientos({
    movimientos,
    filters,
    stats,
}: Props) {
    const { t } = useTranslation(['almacen', 'common']);

    const { search, setSearch, isLoading, applyFilter, setPerPage } =
        useDataTablePage<{
            tipo: string;
        }>({
            routeUrl: almacen.movimientos.index().url,
            initialFilters: {
                search: filters.search,
                per_page: filters.per_page,
                sort: null,
                direction: null,
                tipo: filters.tipo,
            },
            only: ['movimientos', 'filters', 'stats'],
            errorMessage: t('toast.load_error'),
            storageKey: 'foodsaas.almacen.movimientos.prefs',
            defaults: { per_page: 20 },
        });

    const tipoOptions = useMemo<FilterSelectOption[]>(
        () =>
            TIPOS.map((tipo) => ({
                value: tipo,
                label:
                    tipo === 'todos'
                        ? t('movimientos.filters.tipo_all')
                        : t(`movimiento_form.tipos.${tipo}`),
            })),
        [t],
    );

    const columns = useMemo<DataTableColumn<MovimientoRow>[]>(
        () => [
            {
                key: 'fecha',
                header: t('kardex.columns.fecha'),
                cell: (m) => (
                    <span className="text-sm tabular-nums text-muted-foreground">
                        {m.created_at
                            ? new Date(m.created_at).toLocaleString()
                            : '—'}
                    </span>
                ),
            },
            {
                key: 'producto',
                header: t('columns.producto'),
                cell: (m) =>
                    m.producto ? (
                        <Link
                            href={almacen.kardex(m.producto.id).url}
                            className="font-medium text-foreground underline-offset-2 hover:underline"
                        >
                            {m.producto.nombre}
                            {m.producto.codigo ? (
                                <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                                    {m.producto.codigo}
                                </span>
                            ) : null}
                        </Link>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    ),
            },
            {
                key: 'tipo',
                header: t('kardex.columns.tipo'),
                cell: (m) => (
                    <StatBadge
                        label={t(`movimiento_form.tipos.${m.tipo}`, {
                            defaultValue: m.tipo,
                        })}
                        value=""
                        variant="muted"
                    />
                ),
            },
            {
                key: 'cantidad',
                header: t('kardex.columns.cantidad'),
                align: 'right',
                cell: (m) => (
                    <span className="tabular-nums text-sm font-medium">
                        {m.cantidad}
                    </span>
                ),
            },
            {
                key: 'anterior',
                header: t('kardex.columns.anterior'),
                align: 'right',
                cell: (m) => (
                    <span className="tabular-nums text-sm text-muted-foreground">
                        {m.stock_anterior}
                    </span>
                ),
                className: 'hidden md:table-cell',
            },
            {
                key: 'despues',
                header: t('kardex.columns.despues'),
                align: 'right',
                cell: (m) => (
                    <span className="tabular-nums text-sm font-semibold">
                        {m.stock_despues}
                    </span>
                ),
            },
            {
                key: 'motivo',
                header: t('kardex.columns.motivo'),
                cell: (m) => (
                    <span className="line-clamp-1 text-sm text-muted-foreground">
                        {m.motivo ?? '—'}
                    </span>
                ),
                className: 'hidden lg:table-cell',
            },
            {
                key: 'usuario',
                header: t('kardex.columns.usuario'),
                cell: (m) => (
                    <span className="text-sm">{m.user?.name ?? '—'}</span>
                ),
                className: 'hidden xl:table-cell',
            },
        ],
        [t],
    );

    const exportHref = useMemo(() => {
        const params = new URLSearchParams();
        if (filters.search) {
            params.set('search', filters.search);
        }
        if (filters.tipo && filters.tipo !== 'todos') {
            params.set('tipo', filters.tipo);
        }
        const qs = params.toString();
        return qs
            ? `${almacen.movimientos.export().url}?${qs}`
            : almacen.movimientos.export().url;
    }, [filters.search, filters.tipo]);

    return (
        <>
            <Head title={t('movimientos.title')} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('movimientos.title')}
                    description={t('movimientos.subtitle')}
                    stats={[
                        {
                            label: t('movimientos.stats.total'),
                            value: stats.total,
                            variant: 'info',
                            icon: ScrollText,
                        },
                        {
                            label: t('stats_badges.matches', {
                                defaultValue: 'Coincidencias',
                            }),
                            value: stats.coincidencias,
                            variant: 'primary',
                            icon: Package,
                        },
                    ]}
                    action={
                        <div className="flex flex-nowrap items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="cursor-pointer gap-2"
                            >
                                <Link href={almacen.index().url}>
                                    <ArrowLeft className="size-4" />
                                    <span className="hidden sm:inline">
                                        {t('actions.back')}
                                    </span>
                                </Link>
                            </Button>
                            <Can permission="almacen.export">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="cursor-pointer gap-2"
                                    onClick={() => {
                                        window.location.href = exportHref;
                                    }}
                                >
                                    <Download className="size-4" />
                                    <span className="hidden sm:inline">
                                        {t('movimientos.export')}
                                    </span>
                                </Button>
                            </Can>
                        </div>
                    }
                />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <FilterSelect
                        ariaLabel={t('movimientos.filters.tipo_label')}
                        value={filters.tipo}
                        onChange={(tipo) => applyFilter({ tipo })}
                        options={tipoOptions}
                        disabled={isLoading}
                    />
                    <SearchField
                        value={search}
                        onChange={setSearch}
                        placeholder={t('movimientos.search_placeholder')}
                        disabled={isLoading}
                        className="w-full lg:max-w-sm"
                    />
                </div>

                <DataTable
                    columns={columns}
                    data={movimientos.data}
                    rowKey={(row) => row.id}
                    isLoading={isLoading}
                    footer={
                        <DataPagination
                            meta={movimientos}
                            onPerPageChange={setPerPage}
                            perPageOptions={[10, 12, 15, 20, 25, 50]}
                            preservedQuery={{
                                search: filters.search || undefined,
                                per_page: filters.per_page,
                                tipo:
                                    filters.tipo !== 'todos'
                                        ? filters.tipo
                                        : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={ScrollText}
                            title={
                                filters.search || filters.tipo !== 'todos'
                                    ? t('empty.no_results_title')
                                    : t('movimientos.empty_title')
                            }
                            description={
                                filters.search || filters.tipo !== 'todos'
                                    ? t('empty.no_results_description')
                                    : t('movimientos.empty_description')
                            }
                            action={
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="cursor-pointer gap-2"
                                    onClick={() =>
                                        router.visit(almacen.index().url)
                                    }
                                >
                                    <Package className="size-4" />
                                    {t('actions.back')}
                                </Button>
                            }
                        />
                    }
                />
            </div>
        </>
    );
}

Movimientos.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Almacén', href: '/almacen' },
            { title: 'Movimientos', href: '/almacen/movimientos' },
        ]}
    >
        {page}
    </AppLayout>
);

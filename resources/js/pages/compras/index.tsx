import { Head, Link } from '@inertiajs/react';
import {
    ClipboardList,
    FilePlus2,
    PackageOpen,
    Plus,
    RefreshCw,
    Tag,
    Truck,
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import compras from './compras-routes';
import type { CompraEstado, CompraFilters, CompraListRow } from './types';

type Props = {
    compras: Paginated<CompraListRow>;
    filters: CompraFilters;
    stats: {
        total: number;
        borrador: number;
        abiertas: number;
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

const ESTADO_VARIANT: Record<
    CompraEstado,
    'muted' | 'info' | 'warning' | 'success' | 'danger'
> = {
    borrador: 'muted',
    enviada: 'info',
    parcial: 'warning',
    recibida: 'success',
    anulada: 'danger',
};

export default function Index({
    compras: paginated,
    filters,
    stats,
}: Props) {
    const { t } = useTranslation(['compras', 'common']);

    const { search, setSearch, isLoading, setPerPage, applyFilter, fetch } =
        useDataTablePage<{ estado: CompraFilters['estado'] }>({
            routeUrl: compras.index().url,
            initialFilters: { ...filters, sort: null, direction: null },
            only: ['compras', 'filters', 'stats'],
            errorMessage: t('toast.load_error'),
            storageKey: 'foodsaas.compras.prefs',
            defaults: { per_page: 15 },
        });

    const estadoOptions = useMemo<
        readonly FilterSelectOption<CompraFilters['estado']>[]
    >(
        () => [
            { value: 'todos', label: t('filters.todos') },
            { value: 'borrador', label: t('estados.borrador') },
            { value: 'enviada', label: t('estados.enviada'), tone: 'info' },
            { value: 'parcial', label: t('estados.parcial'), tone: 'warning' },
            {
                value: 'recibida',
                label: t('estados.recibida'),
                tone: 'success',
            },
            { value: 'anulada', label: t('estados.anulada'), tone: 'danger' },
        ],
        [t],
    );

    const columns = useMemo<DataTableColumn<CompraListRow>[]>(
        () => [
            {
                key: 'numero',
                header: t('columns.numero'),
                cell: (row) => (
                    <Link
                        href={compras.show(row.id).url}
                        className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
                    >
                        #{row.numero}
                    </Link>
                ),
            },
            {
                key: 'fecha',
                header: t('columns.fecha'),
                cell: (row) => (
                    <span className="tabular-nums text-sm">{row.fecha}</span>
                ),
            },
            {
                key: 'proveedor',
                header: t('columns.proveedor'),
                cell: (row) => row.proveedor?.nombre ?? '—',
            },
            {
                key: 'estado',
                header: t('columns.estado'),
                cell: (row) => (
                    <StatBadge
                        label={t(`estados.${row.estado}`)}
                        value=""
                        variant={ESTADO_VARIANT[row.estado]}
                    />
                ),
            },
            {
                key: 'lineas',
                header: t('columns.lineas'),
                align: 'right',
                cell: (row) => (
                    <span className="tabular-nums text-sm">
                        {row.lineas_count}
                    </span>
                ),
                className: 'hidden md:table-cell',
            },
            {
                key: 'total',
                header: t('columns.total'),
                align: 'right',
                cell: (row) => (
                    <span className="tabular-nums text-sm font-medium">
                        {money(row.total)}
                    </span>
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
                            label: t('stats.total'),
                            value: stats.total,
                            icon: ClipboardList,
                            variant: 'info',
                        },
                        {
                            label: t('stats.borrador'),
                            value: stats.borrador,
                            icon: FilePlus2,
                            variant: 'muted',
                        },
                        {
                            label: t('stats.abiertas'),
                            value: stats.abiertas,
                            icon: PackageOpen,
                            variant:
                                stats.abiertas > 0 ? 'warning' : 'success',
                        },
                        {
                            label: t('stats.coincidencias'),
                            value: stats.coincidencias,
                            icon: Tag,
                            variant: 'primary',
                        },
                    ]}
                    action={
                        <div className="flex flex-wrap justify-end gap-2">
                            <Can permission="proveedores.view">
                                <Button
                                    type="button"
                                    variant="outline"
                                    asChild
                                    className="cursor-pointer gap-2"
                                >
                                    <Link href={compras.proveedores.index().url}>
                                        <Truck className="size-4" />
                                        <span className="hidden sm:inline">
                                            {t('actions.proveedores')}
                                        </span>
                                    </Link>
                                </Button>
                            </Can>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => fetch()}
                                        disabled={isLoading}
                                        className="cursor-pointer"
                                    >
                                        <RefreshCw
                                            className={cn(
                                                'size-4',
                                                isLoading && 'animate-spin',
                                            )}
                                        />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {t('common:actions.reload')}
                                </TooltipContent>
                            </Tooltip>
                            <Can permission="compras.create">
                                <Button
                                    type="button"
                                    asChild
                                    className="cursor-pointer gap-2"
                                >
                                    <Link href={compras.create().url}>
                                        <Plus className="size-4" />
                                        <span className="hidden sm:inline">
                                            {t('actions.new')}
                                        </span>
                                        <span className="sm:hidden">
                                            {t('actions.new_short')}
                                        </span>
                                    </Link>
                                </Button>
                            </Can>
                        </div>
                    }
                />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <FilterSelect
                        ariaLabel={t('filters.estado')}
                        value={filters.estado}
                        onChange={(estado) => applyFilter({ estado })}
                        options={estadoOptions}
                        disabled={isLoading}
                    />
                    <SearchField
                        value={search}
                        onValueChange={setSearch}
                        placeholder={t('search_placeholder')}
                        isSearching={isLoading}
                        className="w-full sm:w-72"
                    />
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
                                search: filters.search || undefined,
                                per_page: filters.per_page,
                                estado:
                                    filters.estado !== 'todos'
                                        ? filters.estado
                                        : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={ClipboardList}
                            title={t('empty.title')}
                            description={t('empty.description')}
                        />
                    }
                />
            </div>
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Compras', href: '/compras' },
        ]}
    >
        {page}
    </AppLayout>
);

import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Download,
    MoreHorizontal,
    Package,
    RefreshCw,
    ScrollText,
    Tag,
    Warehouse,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import almacen from './almacen-routes';
import { MovimientoFormModal } from './components/movimiento-form-modal';
import type { AlmacenFilters, AlmacenProducto, AlmacenStats } from './types';

type Props = {
    productos: Paginated<AlmacenProducto>;
    filters: AlmacenFilters;
    stats: AlmacenStats;
};

function isBajo(p: AlmacenProducto): boolean {
    if (p.control_inventario !== 'sku' || p.stock_minimo === null) {
        return false;
    }
    return Number(p.stock ?? 0) <= Number(p.stock_minimo);
}

export default function Index({ productos: paginated, filters, stats }: Props) {
    const { t } = useTranslation(['almacen', 'common']);
    const { can } = usePermission();
    const canAjustar = can('almacen.ajustar');

    const [adjustProduct, setAdjustProduct] = useState<AlmacenProducto | null>(
        null,
    );

    const { search, setSearch, isLoading, setPerPage, applyFilter, fetch } =
        useDataTablePage<{
            control: AlmacenFilters['control'];
            alerta: AlmacenFilters['alerta'];
        }>({
            routeUrl: almacen.index().url,
            initialFilters: {
                ...filters,
                sort: null,
                direction: null,
            },
            only: ['productos', 'filters', 'stats'],
            errorMessage: t('toast.load_error'),
            storageKey: 'foodsaas.almacen.prefs',
            defaults: { per_page: 15 },
        });

    const controlOptions = useMemo<
        readonly FilterSelectOption<AlmacenFilters['control']>[]
    >(
        () => [
            { value: 'todos', label: t('filters.control_all') },
            { value: 'sku', label: t('filters.control_sku'), tone: 'warning' },
            {
                value: 'recipe',
                label: t('filters.control_recipe'),
                tone: 'info',
            },
        ],
        [t],
    );

    const alertaOptions = useMemo<
        readonly FilterSelectOption<AlmacenFilters['alerta']>[]
    >(
        () => [
            { value: 'todos', label: t('filters.alerta_all') },
            {
                value: 'bajo',
                label: t('filters.alerta_bajo'),
                tone: 'warning',
            },
            { value: 'ok', label: t('filters.alerta_ok'), tone: 'success' },
        ],
        [t],
    );

    const columns = useMemo<DataTableColumn<AlmacenProducto>[]>(() => {
        return [
            {
                key: 'nombre',
                header: t('columns.producto'),
                cell: (p) => (
                    <div className="min-w-0">
                        <p className="truncate font-medium">{p.nombre}</p>
                        {p.codigo ? (
                            <p className="text-xs text-muted-foreground">
                                {p.codigo}
                            </p>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'categoria',
                header: t('columns.categoria'),
                cell: (p) => (
                    <span className="text-sm">
                        {p.categoria?.nombre ?? '—'}
                    </span>
                ),
                className: 'hidden md:table-cell',
            },
            {
                key: 'control',
                header: t('columns.control'),
                cell: (p) => (
                    <StatBadge
                        label={t(`control.${p.control_inventario}`)}
                        value=""
                        variant="muted"
                    />
                ),
            },
            {
                key: 'stock',
                header: t('columns.stock'),
                align: 'right',
                cell: (p) =>
                    p.control_inventario === 'sku' ? (
                        <span
                            className={cn(
                                'inline-flex items-center justify-end gap-1 tabular-nums text-sm font-semibold',
                                isBajo(p) &&
                                    'text-amber-700 dark:text-amber-300',
                            )}
                        >
                            {p.stock ?? '0'}
                            {isBajo(p) ? (
                                <AlertTriangle className="size-3.5" />
                            ) : null}
                        </span>
                    ) : (
                        <span className="text-xs text-muted-foreground">
                            {t('row.recipe_hint')}
                        </span>
                    ),
            },
            {
                key: 'minimo',
                header: t('columns.minimo'),
                align: 'right',
                cell: (p) => (
                    <span className="tabular-nums text-sm text-muted-foreground">
                        {p.stock_minimo ?? '—'}
                    </span>
                ),
                className: 'hidden lg:table-cell',
            },
            {
                key: 'acciones',
                header: (
                    <span className="sr-only">{t('columns.acciones')}</span>
                ),
                align: 'right',
                cell: (p) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 cursor-pointer"
                                aria-label={t('row.actions_for', {
                                    name: p.nombre,
                                })}
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                                asChild
                                className="cursor-pointer gap-2"
                            >
                                <Link href={almacen.kardex(p.id).url}>
                                    <ScrollText className="size-4" />
                                    {t('actions.view_kardex')}
                                </Link>
                            </DropdownMenuItem>
                            {canAjustar && p.control_inventario === 'sku' ? (
                                <DropdownMenuItem
                                    className="cursor-pointer gap-2"
                                    onSelect={() => setAdjustProduct(p)}
                                >
                                    <Package className="size-4" />
                                    {t('actions.adjust')}
                                </DropdownMenuItem>
                            ) : null}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
                className: 'w-12',
            },
        ];
    }, [t, canAjustar]);

    const exportStock = useCallback(() => {
        const params = new URLSearchParams();
        if (filters.search) {
            params.set('search', filters.search);
        }
        const qs = params.toString();
        window.location.href = `${almacen.export().url}${qs ? `?${qs}` : ''}`;
    }, [filters.search]);

    return (
        <>
            <Head title={t('title')} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('subtitle')}
                    stats={[
                        {
                            label: t('stats_badges.sku', {
                                defaultValue: 'Con SKU',
                            }),
                            value: stats.sku,
                            variant: 'info',
                            icon: Package,
                        },
                        {
                            label: t('stats_badges.bajo', {
                                defaultValue: 'Stock bajo',
                            }),
                            value: stats.bajo,
                            variant: stats.bajo > 0 ? 'warning' : 'success',
                            icon: AlertTriangle,
                        },
                        {
                            label: t('stats_badges.recipe', {
                                defaultValue: 'Receta',
                            }),
                            value: stats.recipe,
                            variant: 'primary',
                            icon: Warehouse,
                            hideOnMobile: true,
                        },
                        {
                            label: t('stats_badges.ok', {
                                defaultValue: 'OK',
                            }),
                            value: Math.max(0, stats.sku - stats.bajo),
                            variant: 'success',
                            icon: CheckCircle2,
                            hideOnMobile: true,
                        },
                        {
                            label: t('stats_badges.matches', {
                                defaultValue: 'Coincidencias',
                            }),
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
                                        aria-label={t(
                                            'common:actions.reload',
                                            {
                                                defaultValue: 'Actualizar',
                                            },
                                        )}
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
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="cursor-pointer gap-2"
                            >
                                <Link href={almacen.movimientos.index().url}>
                                    <ScrollText className="size-4" />
                                    <span className="hidden sm:inline">
                                        {t('actions.view_movimientos')}
                                    </span>
                                </Link>
                            </Button>
                            <Can permission="almacen.export">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={exportStock}
                                            className="cursor-pointer gap-2"
                                        >
                                            <Download className="size-4" />
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
                        </div>
                    }
                />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <FilterSelect
                            ariaLabel={t('filters.control_label')}
                            value={filters.control}
                            onChange={(control) => applyFilter({ control })}
                            options={controlOptions}
                            disabled={isLoading}
                        />
                        <FilterSelect
                            ariaLabel={t('filters.alerta_label')}
                            value={filters.alerta}
                            onChange={(alerta) => applyFilter({ alerta })}
                            options={alertaOptions}
                            disabled={isLoading}
                        />
                    </div>
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
                                control: filters.control,
                                alerta:
                                    filters.alerta !== 'todos'
                                        ? filters.alerta
                                        : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Warehouse}
                            title={
                                filters.search || filters.alerta !== 'todos'
                                    ? t('empty.no_results_title')
                                    : t('empty.title')
                            }
                            description={
                                filters.search || filters.alerta !== 'todos'
                                    ? t('empty.no_results_description')
                                    : t('empty.description')
                            }
                        />
                    }
                />
            </div>

            <MovimientoFormModal
                open={adjustProduct !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setAdjustProduct(null);
                    }
                }}
                producto={adjustProduct}
            />
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Almacén', href: '/almacen' },
        ]}
    >
        {page}
    </AppLayout>
);

import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    MoreHorizontal,
    Package,
    Pencil,
    Plus,
    RefreshCw,
    Tag,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
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
import { InsumoFormModal } from './components/insumo-form-modal';
import { InsumoMovimientoModal } from './components/insumo-movimiento-modal';
import insumos from './insumos-routes';
import type { InsumoFilters, InsumoRow, InsumoStats } from './types';

type Props = {
    insumos: Paginated<InsumoRow>;
    filters: InsumoFilters;
    stats: InsumoStats;
    unidades: string[];
};

export default function Index({
    insumos: paginated,
    filters,
    stats,
    unidades,
}: Props) {
    const { t } = useTranslation(['insumos', 'common']);
    const { can } = usePermission();
    const canCreate = can('insumos.create');
    const canUpdate = can('insumos.update');
    const canDelete = can('insumos.delete');
    const canAjustar = can('insumos.ajustar');

    const [formInsumo, setFormInsumo] = useState<InsumoRow | null | 'new'>(
        null,
    );
    const [adjustInsumo, setAdjustInsumo] = useState<InsumoRow | null>(null);
    const [deleteInsumo, setDeleteInsumo] = useState<InsumoRow | null>(null);

    const { search, setSearch, isLoading, setPerPage, applyFilter, fetch } =
        useDataTablePage<{
            estado: InsumoFilters['estado'];
            alerta: InsumoFilters['alerta'];
        }>({
            routeUrl: insumos.index().url,
            initialFilters: {
                ...filters,
                sort: null,
                direction: null,
            },
            only: ['insumos', 'filters', 'stats', 'unidades'],
            errorMessage: t('toast.load_error'),
            storageKey: 'foodsaas.insumos.prefs',
            defaults: { per_page: 15 },
        });

    const estadoOptions = useMemo<
        readonly FilterSelectOption<InsumoFilters['estado']>[]
    >(
        () => [
            { value: 'activos', label: t('filters.activos'), tone: 'success' },
            {
                value: 'inactivos',
                label: t('filters.inactivos'),
                tone: 'warning',
            },
            { value: 'todos', label: t('filters.todos') },
        ],
        [t],
    );

    const alertaOptions = useMemo<
        readonly FilterSelectOption<InsumoFilters['alerta']>[]
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

    const columns = useMemo<DataTableColumn<InsumoRow>[]>(() => {
        return [
            {
                key: 'nombre',
                header: t('columns.nombre'),
                cell: (row) => (
                    <div className="min-w-0">
                        <p className="truncate font-medium">{row.nombre}</p>
                        {row.bajo ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="size-3" />
                                {t('badge.bajo')}
                            </span>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'unidad',
                header: t('columns.unidad'),
                cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                        {row.unidad}
                    </span>
                ),
            },
            {
                key: 'stock',
                header: t('columns.stock'),
                align: 'right',
                cell: (row) => (
                    <span
                        className={cn(
                            'tabular-nums text-sm font-semibold',
                            row.bajo &&
                                'text-amber-700 dark:text-amber-300',
                        )}
                    >
                        {row.stock}
                        {row.stock_minimo != null
                            ? ` / ${row.stock_minimo}`
                            : ''}
                    </span>
                ),
            },
            {
                key: 'costo',
                header: t('columns.costo'),
                align: 'right',
                cell: (row) => (
                    <span className="tabular-nums text-sm">
                        {row.costo_unitario}
                    </span>
                ),
                className: 'hidden md:table-cell',
            },
            {
                key: 'estado',
                header: t('columns.estado'),
                cell: (row) => (
                    <StatBadge
                        label={
                            row.activo
                                ? t('badge.activo')
                                : t('badge.inactivo')
                        }
                        value=""
                        variant={row.activo ? 'success' : 'muted'}
                    />
                ),
            },
            {
                key: 'acciones',
                header: (
                    <span className="sr-only">{t('common:actions.more')}</span>
                ),
                align: 'right',
                cell: (row) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 cursor-pointer"
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            {canUpdate ? (
                                <DropdownMenuItem
                                    className="cursor-pointer gap-2"
                                    onSelect={() => setFormInsumo(row)}
                                >
                                    <Pencil className="size-4" />
                                    {t('common:actions.edit')}
                                </DropdownMenuItem>
                            ) : null}
                            {canAjustar ? (
                                <DropdownMenuItem
                                    className="cursor-pointer gap-2"
                                    onSelect={() => setAdjustInsumo(row)}
                                >
                                    <Package className="size-4" />
                                    {t('actions.ajustar')}
                                </DropdownMenuItem>
                            ) : null}
                            {canDelete ? (
                                <DropdownMenuItem
                                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                    onSelect={() => setDeleteInsumo(row)}
                                >
                                    <Trash2 className="size-4" />
                                    {t('common:actions.delete')}
                                </DropdownMenuItem>
                            ) : null}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
                className: 'w-12',
            },
        ];
    }, [t, canUpdate, canAjustar, canDelete]);

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
                            variant: 'info',
                            icon: Package,
                        },
                        {
                            label: t('stats.activos'),
                            value: stats.activos,
                            variant: 'success',
                            icon: CheckCircle2,
                        },
                        {
                            label: t('stats.bajo'),
                            value: stats.bajo,
                            variant: stats.bajo > 0 ? 'warning' : 'success',
                            icon: AlertTriangle,
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
                            <Can permission="insumos.create">
                                <Button
                                    type="button"
                                    className="cursor-pointer gap-2"
                                    onClick={() => setFormInsumo('new')}
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
                        </div>
                    }
                />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <FilterSelect
                            ariaLabel={t('filters.estado')}
                            value={filters.estado}
                            onChange={(estado) => applyFilter({ estado })}
                            options={estadoOptions}
                            disabled={isLoading}
                        />
                        <FilterSelect
                            ariaLabel={t('filters.alerta')}
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
                                estado: filters.estado,
                                alerta:
                                    filters.alerta !== 'todos'
                                        ? filters.alerta
                                        : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Package}
                            title={t('empty.title')}
                            description={t('empty.description')}
                            action={
                                canCreate ? (
                                    <Button
                                        type="button"
                                        className="cursor-pointer gap-2"
                                        onClick={() => setFormInsumo('new')}
                                    >
                                        <Plus className="size-4" />
                                        {t('actions.create_first')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <InsumoFormModal
                open={formInsumo !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setFormInsumo(null);
                    }
                }}
                insumo={formInsumo === 'new' ? null : formInsumo}
                unidades={unidades}
            />

            <InsumoMovimientoModal
                open={adjustInsumo !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setAdjustInsumo(null);
                    }
                }}
                insumo={adjustInsumo}
            />

            <ConfirmDeleteDialog
                open={deleteInsumo !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteInsumo(null);
                    }
                }}
                title={t('delete.title')}
                description={t('delete.description', {
                    name: deleteInsumo?.nombre ?? '',
                })}
                deleteUrl={
                    deleteInsumo
                        ? insumos.destroy(deleteInsumo.id).url
                        : null
                }
            />
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Insumos', href: '/insumos' },
        ]}
    >
        {page}
    </AppLayout>
);

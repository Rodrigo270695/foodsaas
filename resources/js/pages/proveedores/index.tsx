import { Head, Link } from '@inertiajs/react';
import {
    CheckCircle2,
    MoreHorizontal,
    Pencil,
    Plus,
    RefreshCw,
    Tag,
    Trash2,
    Truck,
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
import compras from '../compras/compras-routes';
import type { ProveedorRow } from '../compras/types';
import { ProveedorFormModal } from './components/proveedor-form-modal';

type Props = {
    proveedores: Paginated<ProveedorRow>;
    filters: {
        search: string;
        estado: 'activos' | 'inactivos' | 'todos';
        per_page: number;
        sort: string | null;
        direction: 'asc' | 'desc' | null;
    };
    stats: { total: number; activos: number; coincidencias: number };
};

export default function Index({
    proveedores: paginated,
    filters,
    stats,
}: Props) {
    const { t } = useTranslation(['compras', 'common']);
    const { can } = usePermission();
    const canUpdate = can('proveedores.update');
    const canDelete = can('proveedores.delete');

    const [formRow, setFormRow] = useState<ProveedorRow | null | 'new'>(null);
    const [deleteRow, setDeleteRow] = useState<ProveedorRow | null>(null);

    const { search, setSearch, isLoading, setPerPage, applyFilter, fetch } =
        useDataTablePage<{ estado: Props['filters']['estado'] }>({
            routeUrl: compras.proveedores.index().url,
            initialFilters: { ...filters, sort: null, direction: null },
            only: ['proveedores', 'filters', 'stats'],
            errorMessage: t('proveedores.toast.load_error'),
            storageKey: 'foodsaas.proveedores.prefs',
            defaults: { per_page: 15 },
        });

    const estadoOptions = useMemo<
        readonly FilterSelectOption<Props['filters']['estado']>[]
    >(
        () => [
            {
                value: 'activos',
                label: t('proveedores.filters.activos'),
                tone: 'success',
            },
            {
                value: 'inactivos',
                label: t('proveedores.filters.inactivos'),
                tone: 'warning',
            },
            { value: 'todos', label: t('proveedores.filters.todos') },
        ],
        [t],
    );

    const columns = useMemo<DataTableColumn<ProveedorRow>[]>(
        () => [
            {
                key: 'nombre',
                header: t('proveedores.columns.nombre'),
                cell: (row) => (
                    <p className="truncate font-medium">{row.nombre}</p>
                ),
            },
            {
                key: 'ruc',
                header: t('proveedores.columns.ruc'),
                cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                        {row.ruc ?? '—'}
                    </span>
                ),
            },
            {
                key: 'telefono',
                header: t('proveedores.columns.telefono'),
                cell: (row) => (
                    <span className="text-sm">{row.telefono ?? '—'}</span>
                ),
                className: 'hidden md:table-cell',
            },
            {
                key: 'estado',
                header: t('proveedores.columns.estado'),
                cell: (row) => (
                    <StatBadge
                        label={
                            row.activo
                                ? t('proveedores.badge.activo')
                                : t('proveedores.badge.inactivo')
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
                        <DropdownMenuContent align="end" className="w-44">
                            {canUpdate ? (
                                <DropdownMenuItem
                                    className="cursor-pointer gap-2"
                                    onSelect={() => setFormRow(row)}
                                >
                                    <Pencil className="size-4" />
                                    {t('common:actions.edit')}
                                </DropdownMenuItem>
                            ) : null}
                            {canDelete ? (
                                <DropdownMenuItem
                                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                    onSelect={() => setDeleteRow(row)}
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
        ],
        [t, canUpdate, canDelete],
    );

    return (
        <>
            <Head title={t('proveedores.title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('proveedores.title')}
                    description={t('proveedores.description')}
                    stats={[
                        {
                            label: t('proveedores.stats.total'),
                            value: stats.total,
                            icon: Truck,
                            variant: 'info',
                        },
                        {
                            label: t('proveedores.stats.activos'),
                            value: stats.activos,
                            icon: CheckCircle2,
                            variant: 'success',
                        },
                        {
                            label: t('proveedores.stats.coincidencias'),
                            value: stats.coincidencias,
                            icon: Tag,
                            variant: 'primary',
                        },
                    ]}
                    action={
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="cursor-pointer"
                            >
                                <Link href={compras.index().url}>
                                    {t('proveedores.actions.back_compras')}
                                </Link>
                            </Button>
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
                            <Can permission="proveedores.create">
                                <Button
                                    type="button"
                                    className="cursor-pointer gap-2"
                                    onClick={() => setFormRow('new')}
                                >
                                    <Plus className="size-4" />
                                    <span className="hidden sm:inline">
                                        {t('proveedores.actions.new')}
                                    </span>
                                </Button>
                            </Can>
                        </div>
                    }
                />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <FilterSelect
                        ariaLabel={t('proveedores.filters.estado')}
                        value={filters.estado}
                        onChange={(estado) => applyFilter({ estado })}
                        options={estadoOptions}
                        disabled={isLoading}
                    />
                    <SearchField
                        value={search}
                        onValueChange={setSearch}
                        placeholder={t('proveedores.search_placeholder')}
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
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Truck}
                            title={t('proveedores.empty.title')}
                            description={t('proveedores.empty.description')}
                        />
                    }
                />
            </div>

            <ProveedorFormModal
                open={formRow !== null}
                onOpenChange={(open) => {
                    if (!open) setFormRow(null);
                }}
                proveedor={formRow === 'new' ? null : formRow}
            />

            <ConfirmDeleteDialog
                open={deleteRow !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteRow(null);
                }}
                title={t('proveedores.delete.title')}
                description={t('proveedores.delete.description', {
                    name: deleteRow?.nombre ?? '',
                })}
                deleteUrl={
                    deleteRow
                        ? compras.proveedores.destroy(deleteRow.id).url
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
            { title: 'Compras', href: '/compras' },
            { title: 'Proveedores', href: '/proveedores' },
        ]}
    >
        {page}
    </AppLayout>
);

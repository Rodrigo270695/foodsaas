import { Head } from '@inertiajs/react';
import {
    CheckCircle2,
    Filter,
    MoreHorizontal,
    Pencil,
    Percent,
    Plus,
    ScreenShare,
    TicketPercent,
    Trash2,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    PageHeader,
    StatBadge,
    type DataTableColumn,
} from '@/components/data-page';
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
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types';
import { OfertaFormModal } from './components/oferta-form-modal';
import ofertas from './ofertas-routes';
import type {
    OfertaEstadoFilter,
    OfertaFilters,
    OfertaRow,
    OfertaStats,
} from './types';

type Props = {
    ofertas: Paginated<OfertaRow>;
    filters: OfertaFilters;
    stats: OfertaStats;
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; oferta: OfertaRow }
    | { type: 'delete'; oferta: OfertaRow };

function formatValor(row: OfertaRow): string {
    if (row.tipo === 'porcentaje') {
        return `${row.valor}%`;
    }

    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(row.valor);
}

export default function OfertasIndex({
    ofertas: paginated,
    filters,
    stats,
}: Props) {
    const { t } = useTranslation(['ofertas', 'common']);
    const { can } = usePermission();
    const canCreate = can('ofertas.create');
    const canUpdate = can('ofertas.update');
    const canDelete = can('ofertas.delete');
    const [modal, setModal] = useState<ModalState>({ type: 'idle' });

    const { search, setSearch, isLoading, setPerPage, applyFilter } =
        useDataTablePage<{ estado: OfertaEstadoFilter }>({
            routeUrl: ofertas.index().url,
            initialFilters: filters,
            only: ['ofertas', 'filters', 'stats'],
            errorMessage: t('ofertas:toast.load_error'),
            storageKey: 'foodsaas.ofertas.prefs',
            defaults: { per_page: 10 },
        });

    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const estadoOptions = useMemo<
        readonly FilterSelectOption<OfertaEstadoFilter>[]
    >(
        () => [
            {
                value: 'activos',
                label: t('ofertas:filters.activos'),
                tone: 'success',
            },
            {
                value: 'inactivos',
                label: t('ofertas:filters.inactivos'),
                tone: 'warning',
            },
            { value: 'todos', label: t('ofertas:filters.todos') },
        ],
        [t],
    );

    const columns = useMemo<DataTableColumn<OfertaRow>[]>(
        () => [
            {
                key: 'codigo',
                header: t('ofertas:columns.codigo'),
                cell: (row) => (
                    <div className="min-w-0">
                        <p className="font-semibold tracking-wide uppercase">
                            {row.codigo}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {row.nombre}
                        </p>
                    </div>
                ),
            },
            {
                key: 'tipo',
                header: t('ofertas:columns.descuento'),
                cell: (row) => (
                    <div className="text-sm">
                        <p className="font-medium tabular-nums">
                            {formatValor(row)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {row.tipo === 'porcentaje'
                                ? t('ofertas:tipos.porcentaje')
                                : t('ofertas:tipos.monto')}
                            {row.tope_monto
                                ? ` · tope S/ ${row.tope_monto.toFixed(2)}`
                                : ''}
                        </p>
                    </div>
                ),
            },
            {
                key: 'usos',
                header: t('ofertas:columns.usos'),
                cell: (row) => (
                    <span className="tabular-nums text-sm">
                        {row.usos_max
                            ? `${row.usos_count}/${row.usos_max}`
                            : String(row.usos_count)}
                    </span>
                ),
                className: 'hidden sm:table-cell',
            },
            {
                key: 'vigencia',
                header: t('ofertas:columns.vigencia'),
                cell: (row) => {
                    if (!row.vigente_desde && !row.vigente_hasta) {
                        return (
                            <span className="text-xs text-muted-foreground italic">
                                {t('ofertas:row.sin_vigencia')}
                            </span>
                        );
                    }

                    return (
                        <span className="text-xs tabular-nums text-muted-foreground">
                            {row.vigente_desde ?? '…'} →{' '}
                            {row.vigente_hasta ?? '…'}
                        </span>
                    );
                },
                className: 'hidden md:table-cell',
            },
            {
                key: 'estado',
                header: t('ofertas:columns.estado'),
                cell: (row) =>
                    row.vigente_hoy ? (
                        <StatBadge
                            label={t('ofertas:row.vigente')}
                            value=""
                            variant="success"
                        />
                    ) : row.activa ? (
                        <StatBadge
                            label={t('ofertas:row.inactiva_hoy')}
                            value=""
                            variant="warning"
                        />
                    ) : (
                        <StatBadge
                            label={t('ofertas:row.desactivada')}
                            value=""
                            variant="muted"
                        />
                    ),
            },
            {
                key: 'acciones',
                header: (
                    <span className="sr-only">
                        {t('ofertas:columns.acciones')}
                    </span>
                ),
                align: 'right',
                cell: (row) =>
                    canUpdate || canDelete ? (
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
                                        onSelect={() =>
                                            setModal({
                                                type: 'edit',
                                                oferta: row,
                                            })
                                        }
                                    >
                                        <Pencil className="size-4" />
                                        {t('common:actions.edit')}
                                    </DropdownMenuItem>
                                ) : null}
                                {canDelete ? (
                                    <DropdownMenuItem
                                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                        onSelect={() =>
                                            setModal({
                                                type: 'delete',
                                                oferta: row,
                                            })
                                        }
                                    >
                                        <Trash2 className="size-4" />
                                        {t('common:actions.delete')}
                                    </DropdownMenuItem>
                                ) : null}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : null,
                className: 'w-12',
            },
        ],
        [t, canUpdate, canDelete],
    );

    return (
        <>
            <Head title={t('ofertas:title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('ofertas:title')}
                    description={t('ofertas:description')}
                    stats={[
                        {
                            icon: TicketPercent,
                            label: t('ofertas:stats.total'),
                            value: stats.total,
                            variant: 'info',
                        },
                        {
                            icon: CheckCircle2,
                            label: t('ofertas:stats.activos'),
                            value: stats.activos,
                            variant: 'success',
                        },
                        {
                            icon: Percent,
                            label: t('ofertas:stats.vigentes'),
                            value: stats.vigentes,
                            variant: 'primary',
                        },
                        {
                            icon: Filter,
                            label: t('ofertas:stats.filtros'),
                            value: stats.filtros,
                            variant: 'warning',
                        },
                        {
                            icon: ScreenShare,
                            label: t('ofertas:stats.coincidencias'),
                            value: stats.coincidencias,
                            variant: 'primary',
                        },
                    ]}
                    action={
                        <Can permission="ofertas.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setModal({ type: 'create' })}
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">
                                    {t('ofertas:actions.create')}
                                </span>
                                <span className="sm:hidden">
                                    {t('ofertas:actions.create_short')}
                                </span>
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(row) => row.id}
                    isLoading={isLoading}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder={t('ofertas:search_placeholder')}
                        >
                            <FilterSelect
                                ariaLabel={t('ofertas:filters.label')}
                                value={filters.estado}
                                onChange={(estado) => applyFilter({ estado })}
                                options={estadoOptions}
                                disabled={isLoading}
                            />
                        </DataToolbar>
                    }
                    footer={
                        <DataPagination
                            meta={paginated}
                            onPerPageChange={setPerPage}
                            preservedQuery={{
                                search: filters.search || undefined,
                                estado: filters.estado,
                                per_page: filters.per_page,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={TicketPercent}
                            title={t('ofertas:empty.title')}
                            description={t('ofertas:empty.description')}
                            action={
                                canCreate ? (
                                    <Button
                                        className="cursor-pointer gap-2"
                                        onClick={() =>
                                            setModal({ type: 'create' })
                                        }
                                    >
                                        <Plus className="size-4" />
                                        {t('ofertas:actions.create_first')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <OfertaFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                oferta={modal.type === 'edit' ? modal.oferta : null}
            />

            <ConfirmDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                title={t('ofertas:delete.title')}
                description={
                    modal.type === 'delete'
                        ? t('ofertas:delete.description', {
                              code: modal.oferta.codigo,
                          })
                        : ''
                }
                deleteUrl={
                    modal.type === 'delete'
                        ? ofertas.destroy(modal.oferta.id).url
                        : null
                }
                onSuccess={closeModal}
            />
        </>
    );
}

OfertasIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Cobros' },
            { title: 'Ofertas', href: '/ofertas' },
        ]}
    >
        {page}
    </AppLayout>
);

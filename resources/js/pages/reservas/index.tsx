import { Head } from '@inertiajs/react';
import {
    CalendarDays,
    Filter,
    Pencil,
    Plus,
    ScreenShare,
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
    type DataTableColumn,
} from '@/components/data-page';
import { DateRangeFilter } from '@/components/date-range-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
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
import {
    ReservaFormModal,
    type MesaOption,
    type ReservaClienteOption,
    type ReservaFormRow,
} from './components/reserva-form-modal';

type ReservaRow = ReservaFormRow & {
    created_by: string | null;
};

type Props = {
    reservas: Paginated<ReservaRow>;
    mesas: MesaOption[];
    clientes: ReservaClienteOption[];
    filters: {
        search: string;
        estado: string;
        desde: string;
        hasta: string;
        per_page: number;
        sort: string | null;
        direction: 'asc' | 'desc' | null;
    };
    estados: string[];
    stats: {
        hoy: number;
        pendientes: number;
        filtros: number;
        coincidencias: number;
    };
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; reserva: ReservaRow }
    | { type: 'delete'; reserva: ReservaRow };

export default function ReservasIndex({
    reservas,
    mesas,
    clientes,
    filters,
    estados,
    stats,
}: Props) {
    const { t } = useTranslation(['reservas', 'common']);
    const canCreate = usePermission('reservas.create');
    const canUpdate = usePermission('reservas.update');
    const canDelete = usePermission('reservas.delete');
    const [modal, setModal] = useState<ModalState>({ type: 'idle' });

    const { search, setSearch, isLoading, setPerPage, applyFilter } =
        useDataTablePage<{
            estado: string;
            desde: string;
            hasta: string;
        }>({
            routeUrl: '/reservas',
            initialFilters: filters,
            only: ['reservas', 'filters', 'stats', 'mesas', 'clientes'],
            errorMessage: t('reservas:toast.load_error'),
            storageKey: 'foodsaas.reservas.prefs',
            defaults: { per_page: 15 },
        });

    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const estadoOptions = useMemo<FilterSelectOption[]>(
        () => [
            { value: 'todas', label: t('reservas:filters.todas') },
            ...estados.map((estado) => ({
                value: estado,
                label: t(`reservas:estados.${estado}`, {
                    defaultValue: estado,
                }),
            })),
        ],
        [t, estados],
    );

    const columns = useMemo<DataTableColumn<ReservaRow>[]>(
        () => [
            {
                id: 'hora',
                header: t('reservas:columns.hora'),
                cell: (row) => {
                    if (!row.reserved_at) {
                        return '—';
                    }
                    const dt = formatPeruDateTime(row.reserved_at);
                    return (
                        <span className="tabular-nums text-sm text-muted-foreground">
                            {dt.fecha}, {dt.hora}
                        </span>
                    );
                },
            },
            {
                id: 'cliente',
                header: t('reservas:columns.cliente'),
                cell: (row) => (
                    <div className="min-w-0">
                        <p className="truncate font-semibold uppercase">
                            {row.cliente_nombre}
                        </p>
                        <p className="text-muted-foreground text-xs">
                            {row.cliente_telefono || '—'} · {row.personas} pax
                        </p>
                    </div>
                ),
            },
            {
                id: 'mesa',
                header: t('reservas:columns.mesa'),
                cell: (row) =>
                    row.mesa
                        ? row.mesa.nombre || row.mesa.codigo
                        : t('reservas:sin_mesa'),
            },
            {
                id: 'estado',
                header: t('reservas:columns.estado'),
                cell: (row) => (
                    <Badge variant="secondary" className="capitalize">
                        {t(`reservas:estados.${row.estado}`, {
                            defaultValue: row.estado,
                        })}
                    </Badge>
                ),
            },
            {
                id: 'acciones',
                header: '',
                cell: (row) => (
                    <div className="flex justify-end gap-0.5">
                        {canUpdate ? (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-8 shrink-0 cursor-pointer border-0 bg-transparent text-sky-600 shadow-none hover:bg-sky-500/10 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                                onClick={() =>
                                    setModal({ type: 'edit', reserva: row })
                                }
                                aria-label={t('common:actions.edit')}
                                title={t('common:actions.edit')}
                            >
                                <Pencil
                                    className="size-4"
                                    strokeWidth={2.25}
                                    aria-hidden
                                />
                            </Button>
                        ) : null}
                        {canDelete ? (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-8 shrink-0 cursor-pointer border-0 bg-transparent text-rose-600 shadow-none hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                                onClick={() =>
                                    setModal({ type: 'delete', reserva: row })
                                }
                                aria-label={t('common:actions.delete')}
                                title={t('common:actions.delete')}
                            >
                                <Trash2
                                    className="size-4"
                                    strokeWidth={2.25}
                                    aria-hidden
                                />
                            </Button>
                        ) : null}
                    </div>
                ),
                className: 'w-20',
            },
        ],
        [t, canUpdate, canDelete],
    );

    return (
        <>
            <Head title={t('reservas:title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('reservas:title')}
                    description={t('reservas:description')}
                    stats={[
                        {
                            icon: CalendarDays,
                            label: t('reservas:stats.hoy'),
                            value: stats.hoy,
                            variant: 'info',
                            onClick: () => {
                                const day = todayIso();
                                applyFilter({ desde: day, hasta: day });
                            },
                        },
                        {
                            icon: CalendarDays,
                            label: t('reservas:stats.pendientes'),
                            value: stats.pendientes,
                            variant: 'warning',
                            onClick: () =>
                                applyFilter({ estado: 'pendiente' }),
                        },
                        {
                            icon: Filter,
                            label: t('reservas:stats.filtros'),
                            value: stats.filtros,
                            variant: 'warning',
                        },
                        {
                            icon: ScreenShare,
                            label: t('reservas:stats.coincidencias'),
                            value: stats.coincidencias,
                            variant: 'primary',
                        },
                    ]}
                    action={
                        <Can permission="reservas.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setModal({ type: 'create' })}
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">
                                    {t('reservas:actions.new')}
                                </span>
                                <span className="sm:hidden">
                                    {t('reservas:actions.new_short')}
                                </span>
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={reservas.data}
                    rowKey={(row) => row.id}
                    isLoading={isLoading}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder={t('reservas:search_placeholder')}
                        >
                            <FilterSelect
                                ariaLabel={t('reservas:filters.label')}
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
                            meta={reservas}
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
                            icon={CalendarDays}
                            title={t('reservas:empty.title')}
                            description={t('reservas:empty.description')}
                            action={
                                canCreate ? (
                                    <Button
                                        className="cursor-pointer gap-2"
                                        onClick={() =>
                                            setModal({ type: 'create' })
                                        }
                                    >
                                        <Plus className="size-4" />
                                        {t('reservas:actions.create_first')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <ReservaFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                reserva={modal.type === 'edit' ? modal.reserva : null}
                mesas={mesas}
                clientes={clientes}
                estados={estados}
                defaultDate={filters.desde || todayIso()}
            />

            <ConfirmDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                title={t('reservas:delete.title')}
                description={
                    modal.type === 'delete'
                        ? t('reservas:delete.description', {
                              name: modal.reserva.cliente_nombre,
                          })
                        : ''
                }
                deleteUrl={
                    modal.type === 'delete'
                        ? `/reservas/${modal.reserva.id}`
                        : null
                }
                onSuccess={closeModal}
            />
        </>
    );
}

ReservasIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Servicio' },
            { title: 'Reservas', href: '/reservas' },
        ]}
    >
        {page}
    </AppLayout>
);

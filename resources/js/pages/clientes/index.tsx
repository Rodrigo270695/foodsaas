import { Head } from '@inertiajs/react';
import {
    FileText,
    Filter,
    Pencil,
    Plus,
    ScreenShare,
    Trash2,
    Users,
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
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';
import type { Paginated } from '@/types';
import {
    ClienteFormModal,
    type ClienteFormRow,
} from './components/cliente-form-modal';

type ClienteRow = ClienteFormRow & {
    total_compras: number;
    ultima_venta: string | null;
};

type Props = {
    clientes: Paginated<ClienteRow>;
    filters: {
        search: string;
        per_page: number;
        sort: string | null;
        direction: 'asc' | 'desc' | null;
    };
    stats: {
        total: number;
        con_documento: number;
        filtros: number;
        coincidencias: number;
    };
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; cliente: ClienteRow }
    | { type: 'delete'; cliente: ClienteRow };

function money(value: number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(value);
}

export default function ClientesIndex({ clientes, filters, stats }: Props) {
    const { t } = useTranslation(['clientes', 'common']);
    const canCreate = usePermission('clientes.create');
    const canUpdate = usePermission('clientes.update');
    const canDelete = usePermission('clientes.delete');
    const [modal, setModal] = useState<ModalState>({ type: 'idle' });

    const { search, setSearch, isLoading, setPerPage } = useDataTablePage({
        routeUrl: '/clientes',
        initialFilters: filters,
        only: ['clientes', 'filters', 'stats'],
        errorMessage: t('clientes:toast.load_error'),
        storageKey: 'foodsaas.clientes.prefs',
        defaults: { per_page: 15 },
    });

    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const columns = useMemo<DataTableColumn<ClienteRow>[]>(
        () => [
            {
                id: 'nombre',
                header: t('clientes:columns.nombre'),
                cell: (row) => (
                    <div className="min-w-0">
                        <p className="truncate font-semibold uppercase">
                            {row.nombre}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                            {row.documento || '—'}
                        </p>
                    </div>
                ),
            },
            {
                id: 'contacto',
                header: t('clientes:columns.contacto'),
                cell: (row) => (
                    <div className="text-sm">
                        <p>{row.telefono || '—'}</p>
                        <p className="text-muted-foreground truncate text-xs">
                            {row.email || '—'}
                        </p>
                    </div>
                ),
            },
            {
                id: 'compras',
                header: t('clientes:columns.compras'),
                cell: (row) => money(row.total_compras),
                className: 'text-right',
            },
            {
                id: 'ultima',
                header: t('clientes:columns.ultima_venta'),
                cell: (row) =>
                    row.ultima_venta
                        ? formatPeruDateTime(row.ultima_venta)
                        : '—',
            },
            {
                id: 'acciones',
                header: '',
                cell: (row) => (
                    <div className="flex justify-end gap-1">
                        {canUpdate ? (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="cursor-pointer"
                                onClick={() =>
                                    setModal({ type: 'edit', cliente: row })
                                }
                            >
                                <Pencil className="size-4" />
                            </Button>
                        ) : null}
                        {canDelete ? (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="cursor-pointer text-destructive"
                                onClick={() =>
                                    setModal({ type: 'delete', cliente: row })
                                }
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        ) : null}
                    </div>
                ),
                className: 'w-24',
            },
        ],
        [t, canUpdate, canDelete],
    );

    return (
        <>
            <Head title={t('clientes:title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('clientes:title')}
                    description={t('clientes:description')}
                    stats={[
                        {
                            icon: Users,
                            label: t('clientes:stats.total'),
                            value: stats.total,
                            variant: 'info',
                        },
                        {
                            icon: FileText,
                            label: t('clientes:stats.con_documento'),
                            value: stats.con_documento,
                            variant: 'success',
                        },
                        {
                            icon: Filter,
                            label: t('clientes:stats.filtros'),
                            value: stats.filtros,
                            variant: 'warning',
                        },
                        {
                            icon: ScreenShare,
                            label: t('clientes:stats.coincidencias'),
                            value: stats.coincidencias,
                            variant: 'primary',
                        },
                    ]}
                    action={
                        <Can permission="clientes.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setModal({ type: 'create' })}
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                                <span className="hidden sm:inline">
                                    {t('clientes:actions.new')}
                                </span>
                                <span className="sm:hidden">
                                    {t('clientes:actions.new_short')}
                                </span>
                            </Button>
                        </Can>
                    }
                />

                <DataTable
                    columns={columns}
                    data={clientes.data}
                    rowKey={(row) => row.id}
                    isLoading={isLoading}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder={t('clientes:search_placeholder')}
                        />
                    }
                    footer={
                        <DataPagination
                            meta={clientes}
                            onPerPageChange={setPerPage}
                            preservedQuery={{
                                search: filters.search || undefined,
                                per_page: filters.per_page,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Users}
                            title={t('clientes:empty.title')}
                            description={t('clientes:empty.description')}
                            action={
                                canCreate ? (
                                    <Button
                                        className="cursor-pointer gap-2"
                                        onClick={() =>
                                            setModal({ type: 'create' })
                                        }
                                    >
                                        <Plus className="size-4" />
                                        {t('clientes:actions.create_first')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <ClienteFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                cliente={modal.type === 'edit' ? modal.cliente : null}
            />

            <ConfirmDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                title={t('clientes:delete.title')}
                description={
                    modal.type === 'delete'
                        ? t('clientes:delete.description', {
                              name: modal.cliente.nombre,
                          })
                        : ''
                }
                deleteUrl={
                    modal.type === 'delete'
                        ? `/clientes/${modal.cliente.id}`
                        : null
                }
                onSuccess={closeModal}
            />
        </>
    );
}

ClientesIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Cobros' },
            { title: 'Clientes', href: '/clientes' },
        ]}
    >
        {page}
    </AppLayout>
);

import { Head, useForm } from '@inertiajs/react';
import { Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DataPagination,
    DataTable,
    EmptyState,
    PageHeader,
    SearchField,
    type DataTableColumn,
} from '@/components/data-page';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';
import type { Paginated } from '@/types';

type ClienteRow = {
    id: string;
    nombre: string;
    documento: string | null;
    telefono: string | null;
    email: string | null;
    notas: string | null;
    total_compras: number;
    ultima_venta: string | null;
};

type Props = {
    clientes: Paginated<ClienteRow>;
    filters: {
        search: string;
        page?: number;
        per_page?: number;
        sort?: string | null;
        direction?: 'asc' | 'desc' | null;
    };
};

type FormState = {
    nombre: string;
    documento: string;
    telefono: string;
    email: string;
    notas: string;
};

const emptyForm = (): FormState => ({
    nombre: '',
    documento: '',
    telefono: '',
    email: '',
    notas: '',
});

function money(value: number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(value);
}

export default function ClientesIndex({ clientes, filters }: Props) {
    const { t } = useTranslation(['clientes', 'common']);
    const canCreate = usePermission('clientes.create');
    const canUpdate = usePermission('clientes.update');
    const canDelete = usePermission('clientes.delete');

    const { search, setSearch, isLoading, setPerPage } = useDataTablePage({
        routeUrl: '/clientes',
        initialFilters: {
            search: filters.search,
            page: clientes.current_page,
            per_page: clientes.per_page,
            sort: filters.sort ?? null,
            direction: filters.direction ?? null,
        },
        only: ['clientes', 'filters'],
        storageKey: 'foodsaas.clientes.prefs',
        defaults: { per_page: 15 },
    });

    const [modal, setModal] = useState<
        | { type: 'idle' }
        | { type: 'create' }
        | { type: 'edit'; cliente: ClienteRow }
        | { type: 'delete'; cliente: ClienteRow }
    >({ type: 'idle' });

    const form = useForm<FormState>(emptyForm());

    const openCreate = () => {
        form.reset();
        form.clearErrors();
        form.setData(emptyForm());
        setModal({ type: 'create' });
    };

    const openEdit = (cliente: ClienteRow) => {
        form.clearErrors();
        form.setData({
            nombre: cliente.nombre,
            documento: cliente.documento ?? '',
            telefono: cliente.telefono ?? '',
            email: cliente.email ?? '',
            notas: cliente.notas ?? '',
        });
        setModal({ type: 'edit', cliente });
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (modal.type === 'create') {
            form.post('/clientes', {
                preserveScroll: true,
                onSuccess: () => setModal({ type: 'idle' }),
            });
            return;
        }
        if (modal.type === 'edit') {
            form.put(`/clientes/${modal.cliente.id}`, {
                preserveScroll: true,
                onSuccess: () => setModal({ type: 'idle' }),
            });
        }
    };

    const columns = useMemo<DataTableColumn<ClienteRow>[]>(
        () => [
            {
                id: 'nombre',
                header: t('clientes:columns.nombre'),
                cell: (row) => (
                    <div className="min-w-0">
                        <p className="truncate font-medium">{row.nombre}</p>
                        {row.documento ? (
                            <p className="text-muted-foreground truncate text-xs">
                                {row.documento}
                            </p>
                        ) : null}
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
                                onClick={() => openEdit(row)}
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

    const modalOpen = modal.type === 'create' || modal.type === 'edit';
    const processing = form.processing;

    return (
        <AppLayout>
            <Head title={t('clientes:title')} />
            <div className="flex flex-col gap-4 p-4 md:p-6">
                <PageHeader
                    title={t('clientes:title')}
                    description={t('clientes:description')}
                    action={
                        canCreate ? (
                            <Button
                                size="sm"
                                className="cursor-pointer gap-2 bg-[#660033] hover:bg-[#4d0026]"
                                onClick={openCreate}
                            >
                                <Plus className="size-4" />
                                {t('clientes:actions.new')}
                            </Button>
                        ) : null
                    }
                />

                <SearchField
                    value={search}
                    onValueChange={setSearch}
                    placeholder={t('clientes:search_placeholder')}
                    isSearching={isLoading}
                    className="w-full sm:w-72"
                />

                {clientes.data.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title={t('clientes:empty.title')}
                        description={t('clientes:empty.description')}
                        action={
                            canCreate ? (
                                <Button
                                    className="cursor-pointer gap-2"
                                    onClick={openCreate}
                                >
                                    <Plus className="size-4" />
                                    {t('clientes:actions.create_first')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        <DataTable
                            columns={columns}
                            data={clientes.data}
                            rowKey={(row) => row.id}
                        />
                        <DataPagination
                            meta={clientes}
                            preservedQuery={{ search: filters.search }}
                            onPerPageChange={setPerPage}
                        />
                    </>
                )}
            </div>

            <FormModal
                open={modalOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setModal({ type: 'idle' });
                    }
                }}
                title={
                    modal.type === 'edit'
                        ? t('clientes:form.edit')
                        : t('clientes:form.create')
                }
                description={t('clientes:form.description')}
                onSubmit={onSubmit}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            disabled={processing}
                            onClick={() => setModal({ type: 'idle' })}
                        >
                            {t('common:actions.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || !form.data.nombre.trim()}
                            className="cursor-pointer gap-2 bg-[#660033] hover:bg-[#4d0026]"
                        >
                            {processing ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : null}
                            {modal.type === 'edit'
                                ? t('clientes:form.submit_edit')
                                : t('clientes:form.submit_create')}
                        </Button>
                    </>
                }
            >
                <FormSection>
                    <FormField
                        label={t('clientes:form.nombre')}
                        error={form.errors.nombre}
                        required
                    >
                        <Input
                            value={form.data.nombre}
                            onChange={(e) =>
                                form.setData('nombre', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        label={t('clientes:form.documento')}
                        error={form.errors.documento}
                    >
                        <Input
                            value={form.data.documento}
                            onChange={(e) =>
                                form.setData('documento', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        label={t('clientes:form.telefono')}
                        error={form.errors.telefono}
                    >
                        <Input
                            value={form.data.telefono}
                            onChange={(e) =>
                                form.setData('telefono', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        label={t('clientes:form.email')}
                        error={form.errors.email}
                    >
                        <Input
                            type="email"
                            value={form.data.email}
                            onChange={(e) =>
                                form.setData('email', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        label={t('clientes:form.notas')}
                        error={form.errors.notas}
                    >
                        <Textarea
                            value={form.data.notas}
                            onChange={(e) =>
                                form.setData('notas', e.target.value)
                            }
                            rows={3}
                        />
                    </FormField>
                </FormSection>
            </FormModal>

            <ConfirmDeleteDialog
                open={modal.type === 'delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        setModal({ type: 'idle' });
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
                onSuccess={() => setModal({ type: 'idle' })}
            />
        </AppLayout>
    );
}

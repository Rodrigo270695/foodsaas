import { Head, router, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    Loader2,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DataTable,
    EmptyState,
    PageHeader,
    type DataTableColumn,
} from '@/components/data-page';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';

type MesaOption = {
    id: string;
    codigo: string;
    nombre: string | null;
    capacidad: number;
};

type ReservaRow = {
    id: string;
    cliente_nombre: string;
    cliente_telefono: string | null;
    personas: number;
    reserved_at: string | null;
    estado: string;
    notas: string | null;
    mesa: { id: string; codigo: string; nombre: string | null } | null;
    created_by: string | null;
};

type Props = {
    reservas: ReservaRow[];
    mesas: MesaOption[];
    filters: { fecha: string; estado: string };
    estados: string[];
};

type FormState = {
    mesa_id: string;
    cliente_nombre: string;
    cliente_telefono: string;
    personas: number;
    reserved_at: string;
    estado: string;
    notas: string;
};

function toLocalInput(iso: string | null | undefined): string {
    if (!iso) {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

export default function ReservasIndex({
    reservas,
    mesas,
    filters,
    estados,
}: Props) {
    const { t } = useTranslation(['reservas', 'common']);
    const canCreate = usePermission('reservas.create');
    const canUpdate = usePermission('reservas.update');
    const canDelete = usePermission('reservas.delete');

    const [modal, setModal] = useState<
        | { type: 'idle' }
        | { type: 'create' }
        | { type: 'edit'; reserva: ReservaRow }
        | { type: 'delete'; reserva: ReservaRow }
    >({ type: 'idle' });

    const form = useForm<FormState>({
        mesa_id: '',
        cliente_nombre: '',
        cliente_telefono: '',
        personas: 2,
        reserved_at: toLocalInput(null),
        estado: 'pendiente',
        notas: '',
    });

    const estadoOptions = useMemo<FilterSelectOption[]>(
        () => [
            { value: 'todas', label: t('reservas:filters.todas') },
            ...estados.map((estado) => ({
                value: estado,
                label: t(`reservas:estados.${estado}`, { defaultValue: estado }),
            })),
        ],
        [t, estados],
    );

    const openCreate = () => {
        form.reset();
        form.clearErrors();
        form.setData({
            mesa_id: '',
            cliente_nombre: '',
            cliente_telefono: '',
            personas: 2,
            reserved_at: `${filters.fecha}T19:00`,
            estado: 'pendiente',
            notas: '',
        });
        setModal({ type: 'create' });
    };

    const openEdit = (reserva: ReservaRow) => {
        form.clearErrors();
        form.setData({
            mesa_id: reserva.mesa?.id ?? '',
            cliente_nombre: reserva.cliente_nombre,
            cliente_telefono: reserva.cliente_telefono ?? '',
            personas: reserva.personas,
            reserved_at: toLocalInput(reserva.reserved_at),
            estado: reserva.estado,
            notas: reserva.notas ?? '',
        });
        setModal({ type: 'edit', reserva });
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        const payload = {
            ...form.data,
            mesa_id: form.data.mesa_id || null,
        };
        if (modal.type === 'create') {
            form.transform(() => payload).post('/reservas', {
                preserveScroll: true,
                onSuccess: () => setModal({ type: 'idle' }),
            });
            return;
        }
        if (modal.type === 'edit') {
            form.transform(() => payload).put(`/reservas/${modal.reserva.id}`, {
                preserveScroll: true,
                onSuccess: () => setModal({ type: 'idle' }),
            });
        }
    };

    const columns = useMemo<DataTableColumn<ReservaRow>[]>(
        () => [
            {
                id: 'hora',
                header: t('reservas:columns.hora'),
                cell: (row) =>
                    row.reserved_at
                        ? formatPeruDateTime(row.reserved_at)
                        : '—',
            },
            {
                id: 'cliente',
                header: t('reservas:columns.cliente'),
                cell: (row) => (
                    <div className="min-w-0">
                        <p className="truncate font-medium">
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
                                    setModal({ type: 'delete', reserva: row })
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

    return (
        <>
            <Head title={t('reservas:title')} />
            <div className="flex flex-col gap-4 p-4 md:p-6">
                <PageHeader
                    title={t('reservas:title')}
                    description={t('reservas:description')}
                    action={
                        canCreate ? (
                            <Button
                                size="sm"
                                className="cursor-pointer gap-2 bg-[#660033] hover:bg-[#4d0026]"
                                onClick={openCreate}
                            >
                                <Plus className="size-4" />
                                {t('reservas:actions.new')}
                            </Button>
                        ) : null
                    }
                />

                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        type="date"
                        value={filters.fecha}
                        className="w-auto"
                        onChange={(e) =>
                            router.get(
                                '/reservas',
                                {
                                    fecha: e.target.value,
                                    estado: filters.estado,
                                },
                                {
                                    preserveState: true,
                                    preserveScroll: true,
                                    replace: true,
                                    only: ['reservas', 'filters'],
                                },
                            )
                        }
                    />
                    <FilterSelect
                        ariaLabel={t('reservas:filters.label')}
                        value={filters.estado}
                        onChange={(estado) =>
                            router.get(
                                '/reservas',
                                { fecha: filters.fecha, estado },
                                {
                                    preserveState: true,
                                    preserveScroll: true,
                                    replace: true,
                                    only: ['reservas', 'filters'],
                                },
                            )
                        }
                        options={estadoOptions}
                    />
                </div>

                {reservas.length === 0 ? (
                    <EmptyState
                        icon={CalendarDays}
                        title={t('reservas:empty.title')}
                        description={t('reservas:empty.description')}
                        action={
                            canCreate ? (
                                <Button
                                    className="cursor-pointer gap-2"
                                    onClick={openCreate}
                                >
                                    <Plus className="size-4" />
                                    {t('reservas:actions.create_first')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <DataTable
                        columns={columns}
                        data={reservas}
                        rowKey={(row) => row.id}
                    />
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
                        ? t('reservas:form.edit')
                        : t('reservas:form.create')
                }
                description={t('reservas:form.description')}
                onSubmit={onSubmit}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            disabled={form.processing}
                            onClick={() => setModal({ type: 'idle' })}
                        >
                            {t('common:actions.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                form.processing ||
                                !form.data.cliente_nombre.trim()
                            }
                            className="cursor-pointer gap-2 bg-[#660033] hover:bg-[#4d0026]"
                        >
                            {form.processing ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : null}
                            {modal.type === 'edit'
                                ? t('reservas:form.submit_edit')
                                : t('reservas:form.submit_create')}
                        </Button>
                    </>
                }
            >
                <FormSection>
                    <FormField
                        label={t('reservas:form.cliente_nombre')}
                        error={form.errors.cliente_nombre}
                        required
                    >
                        <Input
                            value={form.data.cliente_nombre}
                            onChange={(e) =>
                                form.setData('cliente_nombre', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        label={t('reservas:form.cliente_telefono')}
                        error={form.errors.cliente_telefono}
                    >
                        <Input
                            value={form.data.cliente_telefono}
                            onChange={(e) =>
                                form.setData(
                                    'cliente_telefono',
                                    e.target.value,
                                )
                            }
                        />
                    </FormField>
                    <FormField
                        label={t('reservas:form.personas')}
                        error={form.errors.personas}
                        required
                    >
                        <Input
                            type="number"
                            min={1}
                            max={99}
                            value={form.data.personas}
                            onChange={(e) =>
                                form.setData(
                                    'personas',
                                    Number(e.target.value) || 1,
                                )
                            }
                        />
                    </FormField>
                    <FormField
                        label={t('reservas:form.reserved_at')}
                        error={form.errors.reserved_at}
                        required
                    >
                        <Input
                            type="datetime-local"
                            value={form.data.reserved_at}
                            onChange={(e) =>
                                form.setData('reserved_at', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        label={t('reservas:form.mesa')}
                        error={form.errors.mesa_id}
                    >
                        <Select
                            value={form.data.mesa_id || '__none__'}
                            onValueChange={(value) =>
                                form.setData(
                                    'mesa_id',
                                    value === '__none__' ? '' : value,
                                )
                            }
                        >
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={t('reservas:sin_mesa')}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">
                                    {t('reservas:sin_mesa')}
                                </SelectItem>
                                {mesas.map((mesa) => (
                                    <SelectItem key={mesa.id} value={mesa.id}>
                                        {mesa.nombre || mesa.codigo} (
                                        {mesa.capacidad})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    {modal.type === 'edit' ? (
                        <FormField
                            label={t('reservas:form.estado')}
                            error={form.errors.estado}
                        >
                            <Select
                                value={form.data.estado}
                                onValueChange={(value) =>
                                    form.setData('estado', value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {estados.map((estado) => (
                                        <SelectItem key={estado} value={estado}>
                                            {t(`reservas:estados.${estado}`, {
                                                defaultValue: estado,
                                            })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                    ) : null}
                    <FormField
                        label={t('reservas:form.notas')}
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
                onSuccess={() => setModal({ type: 'idle' })}
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

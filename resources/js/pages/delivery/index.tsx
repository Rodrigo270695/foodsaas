import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Bike,
    CheckCircle2,
    ClipboardList,
    Loader2,
    Plus,
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
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';

type PedidoRow = {
    id: string;
    numero: number;
    estado: string;
    comensales: number;
    notas: string | null;
    total: string | number;
    lineas_pendientes_count: number;
    lineas_cola_count: number;
    opened_by: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type Props = {
    pedidos: PedidoRow[];
    filters: { estado: string };
    stats: { activos: number; hoy: number };
};

function money(value: string | number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(Number(value));
}

export default function DeliveryIndex({ pedidos, filters, stats }: Props) {
    const { t } = useTranslation(['delivery', 'common']);
    const canCreate = usePermission('delivery.create');
    const [open, setOpen] = useState(false);

    const form = useForm({
        cliente_nombre: '',
        comensales: 1,
        notas: '',
    });

    const estadoOptions = useMemo<FilterSelectOption[]>(
        () => [
            { value: 'activos', label: t('delivery:filters.activos') },
            { value: 'historico', label: t('delivery:filters.historico') },
            { value: 'todos', label: t('delivery:filters.todos') },
        ],
        [t],
    );

    const columns = useMemo<DataTableColumn<PedidoRow>[]>(
        () => [
            {
                id: 'numero',
                header: t('delivery:columns.pedido'),
                cell: (row) => (
                    <div className="min-w-0">
                        <Link
                            href={`/pedidos/${row.id}`}
                            className="font-semibold text-[#660033] hover:underline"
                        >
                            #{row.numero}
                        </Link>
                        <p className="text-muted-foreground text-xs capitalize">
                            {row.estado}
                        </p>
                    </div>
                ),
            },
            {
                id: 'cliente',
                header: t('delivery:columns.detalle'),
                cell: (row) => (
                    <div className="max-w-xs truncate text-sm">
                        {row.notas || '—'}
                    </div>
                ),
            },
            {
                id: 'lineas',
                header: t('delivery:columns.cocina'),
                cell: (row) => (
                    <div className="flex flex-wrap gap-1">
                        {row.lineas_pendientes_count > 0 ? (
                            <Badge variant="secondary">
                                {row.lineas_pendientes_count} pend.
                            </Badge>
                        ) : null}
                        {row.lineas_cola_count > 0 ? (
                            <Badge variant="outline">
                                {row.lineas_cola_count} cocina
                            </Badge>
                        ) : null}
                        {row.lineas_pendientes_count === 0 &&
                        row.lineas_cola_count === 0
                            ? '—'
                            : null}
                    </div>
                ),
            },
            {
                id: 'total',
                header: t('delivery:columns.total'),
                cell: (row) => money(row.total),
                className: 'text-right font-medium',
            },
            {
                id: 'cuando',
                header: t('delivery:columns.hora'),
                cell: (row) =>
                    row.created_at ? formatPeruDateTime(row.created_at) : '—',
            },
            {
                id: 'acciones',
                header: '',
                cell: (row) => (
                    <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        asChild
                    >
                        <Link href={`/pedidos/${row.id}`}>
                            {t('delivery:actions.open')}
                        </Link>
                    </Button>
                ),
                className: 'text-right',
            },
        ],
        [t],
    );

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/delivery', {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <>
            <Head title={t('delivery:title')} />
            <div className="flex flex-col gap-4 p-4 md:p-6">
                <PageHeader
                    title={t('delivery:title')}
                    description={t('delivery:description')}
                    stats={[
                        {
                            icon: Bike,
                            label: t('delivery:stats.activos'),
                            value: stats.activos,
                            variant: 'primary',
                        },
                        {
                            icon: CheckCircle2,
                            label: t('delivery:stats.hoy'),
                            value: stats.hoy,
                        },
                    ]}
                    action={
                        canCreate ? (
                            <Button
                                size="sm"
                                className="cursor-pointer gap-2 bg-[#660033] hover:bg-[#4d0026]"
                                onClick={() => {
                                    form.reset();
                                    form.clearErrors();
                                    setOpen(true);
                                }}
                            >
                                <Plus className="size-4" />
                                {t('delivery:actions.new')}
                            </Button>
                        ) : null
                    }
                />

                <FilterSelect
                    ariaLabel={t('delivery:filters.label')}
                    value={filters.estado}
                    onChange={(estado) =>
                        router.get(
                            '/delivery',
                            { estado },
                            {
                                preserveState: true,
                                preserveScroll: true,
                                replace: true,
                                only: ['pedidos', 'filters', 'stats'],
                            },
                        )
                    }
                    options={estadoOptions}
                />

                {pedidos.length === 0 ? (
                    <EmptyState
                        icon={ClipboardList}
                        title={t('delivery:empty.title')}
                        description={t('delivery:empty.description')}
                        action={
                            canCreate ? (
                                <Button
                                    className="cursor-pointer gap-2"
                                    onClick={() => setOpen(true)}
                                >
                                    <Plus className="size-4" />
                                    {t('delivery:actions.create_first')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <DataTable
                        columns={columns}
                        data={pedidos}
                        rowKey={(row) => row.id}
                    />
                )}
            </div>

            <FormModal
                open={open}
                onOpenChange={setOpen}
                title={t('delivery:form.title')}
                description={t('delivery:form.description')}
                onSubmit={onSubmit}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            disabled={form.processing}
                            onClick={() => setOpen(false)}
                        >
                            {t('common:actions.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="cursor-pointer gap-2 bg-[#660033] hover:bg-[#4d0026]"
                        >
                            {form.processing ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : null}
                            {t('delivery:form.submit')}
                        </Button>
                    </>
                }
            >
                <FormSection>
                    <FormField
                        label={t('delivery:form.cliente')}
                        error={form.errors.cliente_nombre}
                    >
                        <Input
                            value={form.data.cliente_nombre}
                            onChange={(e) =>
                                form.setData('cliente_nombre', e.target.value)
                            }
                            placeholder={t('delivery:form.cliente_placeholder')}
                        />
                    </FormField>
                    <FormField
                        label={t('delivery:form.comensales')}
                        error={form.errors.comensales}
                    >
                        <Input
                            type="number"
                            min={1}
                            max={99}
                            value={form.data.comensales}
                            onChange={(e) =>
                                form.setData(
                                    'comensales',
                                    Number(e.target.value) || 1,
                                )
                            }
                        />
                    </FormField>
                    <FormField
                        label={t('delivery:form.notas')}
                        error={form.errors.notas}
                    >
                        <Textarea
                            value={form.data.notas}
                            onChange={(e) =>
                                form.setData('notas', e.target.value)
                            }
                            rows={3}
                            placeholder={t('delivery:form.notas_placeholder')}
                        />
                    </FormField>
                </FormSection>
            </FormModal>
        </>
    );
}

DeliveryIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Servicio' },
            { title: 'Delivery', href: '/delivery' },
        ]}
    >
        {page}
    </AppLayout>
);

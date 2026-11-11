import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeftRight, PackageCheck, Plus, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DataPagination,
    DataTable,
    EmptyState,
    PageHeader,
    StatBadge,
    type DataTableColumn,
} from '@/components/data-page';
import { Button } from '@/components/ui/button';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types';
import {
    TRANSFERENCIA_ESTADO_VARIANT,
    transferenciasUrl,
    type TransferenciaEstado,
    type TransferenciaListRow,
} from './types';

type EstadoFilter = 'todos' | TransferenciaEstado;

type Props = {
    transferencias: Paginated<TransferenciaListRow>;
    filters: { estado: EstadoFilter };
    stats: { total: number; enviadas: number; recibidas: number };
};

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-PE');
}

export default function Index({ transferencias, filters, stats }: Props) {
    const { t } = useTranslation(['transferencias', 'common']);
    const [loading, setLoading] = useState(false);

    const estadoOptions = useMemo<readonly FilterSelectOption<EstadoFilter>[]>(
        () => [
            { value: 'todos', label: t('filters.todos') },
            { value: 'borrador', label: t('estados.borrador') },
            { value: 'enviada', label: t('estados.enviada'), tone: 'info' },
            {
                value: 'recibida',
                label: t('estados.recibida'),
                tone: 'success',
            },
            { value: 'anulada', label: t('estados.anulada'), tone: 'danger' },
        ],
        [t],
    );

    const applyEstado = (estado: EstadoFilter) => {
        router.get(
            transferenciasUrl.index,
            { estado: estado === 'todos' ? undefined : estado },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    };

    const columns = useMemo<DataTableColumn<TransferenciaListRow>[]>(
        () => [
            {
                key: 'numero',
                header: t('columns.numero'),
                cell: (row) => (
                    <Link
                        href={transferenciasUrl.show(row.id)}
                        className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
                    >
                        #{row.numero}
                    </Link>
                ),
            },
            {
                key: 'origen',
                header: t('columns.origen'),
                cell: (row) => row.origen ?? '—',
            },
            {
                key: 'destino',
                header: t('columns.destino'),
                cell: (row) => row.destino ?? '—',
            },
            {
                key: 'estado',
                header: t('columns.estado'),
                cell: (row) => (
                    <StatBadge
                        label={t(`estados.${row.estado}`)}
                        value=""
                        variant={TRANSFERENCIA_ESTADO_VARIANT[row.estado]}
                    />
                ),
            },
            {
                key: 'lineas',
                header: t('columns.lineas'),
                align: 'right',
                className: 'hidden md:table-cell',
                cell: (row) => (
                    <span className="text-sm tabular-nums">
                        {row.lineas_count}
                    </span>
                ),
            },
            {
                key: 'enviada',
                header: t('columns.enviada'),
                className: 'hidden lg:table-cell',
                cell: (row) => (
                    <span className="text-sm tabular-nums">
                        {formatDate(row.enviada_at)}
                    </span>
                ),
            },
            {
                key: 'recibida',
                header: t('columns.recibida'),
                className: 'hidden lg:table-cell',
                cell: (row) => (
                    <span className="text-sm tabular-nums">
                        {formatDate(row.recibida_at)}
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
                            icon: ArrowLeftRight,
                            variant: 'info',
                        },
                        {
                            label: t('stats.enviadas'),
                            value: stats.enviadas,
                            icon: Truck,
                            variant: stats.enviadas > 0 ? 'warning' : 'muted',
                        },
                        {
                            label: t('stats.recibidas'),
                            value: stats.recibidas,
                            icon: PackageCheck,
                            variant: 'success',
                        },
                    ]}
                    action={
                        <Button
                            type="button"
                            asChild
                            className="cursor-pointer gap-2"
                        >
                            <Link href={transferenciasUrl.create}>
                                <Plus className="size-4" />
                                <span className="hidden sm:inline">
                                    {t('actions.new')}
                                </span>
                                <span className="sm:hidden">
                                    {t('actions.new_short')}
                                </span>
                            </Link>
                        </Button>
                    }
                />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <FilterSelect
                        ariaLabel={t('filters.estado')}
                        value={filters.estado}
                        onChange={applyEstado}
                        options={estadoOptions}
                        disabled={loading}
                    />
                </div>

                <DataTable
                    columns={columns}
                    data={transferencias.data}
                    rowKey={(row) => row.id}
                    isLoading={loading}
                    footer={
                        <DataPagination
                            meta={transferencias}
                            preservedQuery={{
                                estado:
                                    filters.estado !== 'todos'
                                        ? filters.estado
                                        : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={ArrowLeftRight}
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
            { title: 'Transferencias', href: '/transferencias' },
        ]}
    >
        {page}
    </AppLayout>
);

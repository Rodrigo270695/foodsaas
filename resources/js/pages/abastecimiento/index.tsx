import { Head, Link, router } from '@inertiajs/react';
import { ClipboardList, Hourglass, Plus } from 'lucide-react';
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
    REQUERIMIENTO_ESTADO_VARIANT,
    abastecimientoUrl,
    type RequerimientoEstado,
    type RequerimientoListRow,
} from './types';

type EstadoFilter = 'todos' | RequerimientoEstado;

type Props = {
    requerimientos: Paginated<RequerimientoListRow>;
    filters: { estado: EstadoFilter };
    stats: { total: number; pendientes: number };
};

export default function Index({ requerimientos, filters, stats }: Props) {
    const { t } = useTranslation(['abastecimiento', 'common']);
    const [loading, setLoading] = useState(false);

    const estadoOptions = useMemo<readonly FilterSelectOption<EstadoFilter>[]>(
        () => [
            { value: 'todos', label: t('filters.todos') },
            { value: 'borrador', label: t('estados.borrador') },
            {
                value: 'solicitado',
                label: t('estados.solicitado'),
                tone: 'info',
            },
            {
                value: 'aprobado',
                label: t('estados.aprobado'),
                tone: 'warning',
            },
            {
                value: 'atendido',
                label: t('estados.atendido'),
                tone: 'success',
            },
            {
                value: 'rechazado',
                label: t('estados.rechazado'),
                tone: 'danger',
            },
            { value: 'anulado', label: t('estados.anulado'), tone: 'danger' },
        ],
        [t],
    );

    const applyEstado = (estado: EstadoFilter) => {
        router.get(
            abastecimientoUrl.index,
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

    const columns = useMemo<DataTableColumn<RequerimientoListRow>[]>(
        () => [
            {
                key: 'numero',
                header: t('columns.numero'),
                cell: (row) => (
                    <Link
                        href={abastecimientoUrl.show(row.id)}
                        className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
                    >
                        #{row.numero}
                    </Link>
                ),
            },
            {
                key: 'solicitante',
                header: t('columns.solicitante'),
                cell: (row) => row.solicitante ?? '—',
            },
            {
                key: 'abastecedora',
                header: t('columns.abastecedora'),
                cell: (row) => row.abastecedora ?? '—',
            },
            {
                key: 'estado',
                header: t('columns.estado'),
                cell: (row) => (
                    <StatBadge
                        label={t(`estados.${row.estado}`)}
                        value=""
                        variant={REQUERIMIENTO_ESTADO_VARIANT[row.estado]}
                    />
                ),
            },
            {
                key: 'prioridad',
                header: t('columns.prioridad'),
                className: 'hidden md:table-cell',
                cell: (row) => (
                    <StatBadge
                        label={t(`prioridades.${row.prioridad}`)}
                        value=""
                        variant={
                            row.prioridad === 'alta'
                                ? 'danger'
                                : row.prioridad === 'baja'
                                  ? 'muted'
                                  : 'default'
                        }
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
                key: 'fecha',
                header: t('columns.fecha_necesaria'),
                className: 'hidden lg:table-cell',
                cell: (row) => (
                    <span className="text-sm tabular-nums">
                        {row.fecha_necesaria ?? '—'}
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
                            icon: ClipboardList,
                            variant: 'info',
                        },
                        {
                            label: t('stats.pendientes'),
                            value: stats.pendientes,
                            icon: Hourglass,
                            variant:
                                stats.pendientes > 0 ? 'warning' : 'success',
                        },
                    ]}
                    action={
                        <Button
                            type="button"
                            asChild
                            className="cursor-pointer gap-2"
                        >
                            <Link href={abastecimientoUrl.create}>
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
                    data={requerimientos.data}
                    rowKey={(row) => row.id}
                    isLoading={loading}
                    footer={
                        <DataPagination
                            meta={requerimientos}
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
                            icon={ClipboardList}
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
            { title: 'Abastecimiento', href: '/abastecimiento' },
        ]}
    >
        {page}
    </AppLayout>
);

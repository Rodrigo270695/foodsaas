import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Download, Receipt, Wallet } from 'lucide-react';
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

type PagoRow = {
    id: string;
    tenant: string | null;
    slug: string | null;
    plan: string | null;
    total: number;
    moneda: string | null;
    estado: string;
    pasarela: string | null;
    pagado_at: string | null;
    created_at: string | null;
    subscription_id: string | null;
};

type Props = {
    pagos: Paginated<PagoRow>;
    filters: { estado: string; subscription_id: string };
    stats: { total: number; pagados: number; monto_pagado: number };
};

const BASE = '/plataforma/cobros';

const ESTADO_VARIANT: Record<
    string,
    'muted' | 'info' | 'warning' | 'success' | 'danger'
> = {
    pagado: 'success',
    pendiente: 'warning',
    fallido: 'danger',
};

function money(value: number, moneda?: string | null): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: moneda || 'PEN',
    }).format(value);
}

export default function Index({ pagos, filters, stats }: Props) {
    const { t } = useTranslation(['common']);
    const p = 'plataforma.cobros';
    const [loading, setLoading] = useState(false);

    const estadoOptions = useMemo<readonly FilterSelectOption<string>[]>(
        () => [
            { value: 'todos', label: t(`${p}.filters.todos`) },
            {
                value: 'pagado',
                label: t(`${p}.filters.pagado`),
                tone: 'success',
            },
            {
                value: 'pendiente',
                label: t(`${p}.filters.pendiente`),
                tone: 'warning',
            },
            {
                value: 'fallido',
                label: t(`${p}.filters.fallido`),
                tone: 'danger',
            },
        ],
        [t],
    );

    const applyEstado = (estado: string) => {
        router.get(
            BASE,
            {
                estado: estado === 'todos' ? undefined : estado,
                subscription_id: filters.subscription_id || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    };

    const columns = useMemo<DataTableColumn<PagoRow>[]>(
        () => [
            {
                key: 'tenant',
                header: t(`${p}.columns.tenant`),
                cell: (row) => (
                    <div>
                        <p className="font-medium">{row.tenant ?? '—'}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                            {row.slug}
                        </p>
                    </div>
                ),
            },
            {
                key: 'plan',
                header: t(`${p}.columns.plan`),
                className: 'hidden md:table-cell',
                cell: (row) => row.plan ?? '—',
            },
            {
                key: 'total',
                header: t(`${p}.columns.total`),
                align: 'right',
                cell: (row) => (
                    <span className="text-sm font-medium tabular-nums">
                        {money(row.total, row.moneda)}
                    </span>
                ),
            },
            {
                key: 'estado',
                header: t(`${p}.columns.estado`),
                cell: (row) => (
                    <StatBadge
                        label={row.estado}
                        value=""
                        variant={ESTADO_VARIANT[row.estado] ?? 'muted'}
                    />
                ),
            },
            {
                key: 'pasarela',
                header: t(`${p}.columns.pasarela`),
                className: 'hidden lg:table-cell',
                cell: (row) => row.pasarela ?? '—',
            },
            {
                key: 'fecha',
                header: t(`${p}.columns.fecha`),
                className: 'hidden md:table-cell',
                cell: (row) => {
                    const iso = row.pagado_at ?? row.created_at;
                    return (
                        <span className="text-sm tabular-nums">
                            {iso ? new Date(iso).toLocaleString('es-PE') : '—'}
                        </span>
                    );
                },
            },
        ],
        [t],
    );

    return (
        <>
            <Head title={t(`${p}.title`)} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t(`${p}.title`)}
                    description={t(`${p}.description`)}
                    stats={[
                        {
                            label: t(`${p}.stats.total`),
                            value: stats.total,
                            icon: Receipt,
                            variant: 'info',
                        },
                        {
                            label: t(`${p}.stats.pagados`),
                            value: stats.pagados,
                            icon: CheckCircle2,
                            variant: 'success',
                        },
                        {
                            label: t(`${p}.stats.monto`),
                            value: money(stats.monto_pagado),
                            icon: Wallet,
                            variant: 'primary',
                        },
                    ]}
                    action={
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer gap-2"
                        >
                            <a href={`${BASE}/exportar`}>
                                <Download className="size-4" />
                                <span className="hidden sm:inline">
                                    {t(`${p}.export`)}
                                </span>
                            </a>
                        </Button>
                    }
                />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <FilterSelect
                        ariaLabel={t(`${p}.filters.estado`)}
                        value={filters.estado}
                        onChange={applyEstado}
                        options={estadoOptions}
                        disabled={loading}
                    />
                </div>

                <DataTable
                    columns={columns}
                    data={pagos.data}
                    rowKey={(row) => row.id}
                    isLoading={loading}
                    footer={
                        <DataPagination
                            meta={pagos}
                            preservedQuery={{
                                estado:
                                    filters.estado !== 'todos'
                                        ? filters.estado
                                        : undefined,
                                subscription_id:
                                    filters.subscription_id || undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Receipt}
                            title={t(`${p}.empty.title`)}
                            description={t(`${p}.empty.description`)}
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
            { title: 'Plataforma' },
            { title: 'Cobros', href: '/plataforma/cobros' },
        ]}
    >
        {page}
    </AppLayout>
);

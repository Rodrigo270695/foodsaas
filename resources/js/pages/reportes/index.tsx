import { Head, router } from '@inertiajs/react';
import {
    BarChart3,
    Download,
    Percent,
    Receipt,
    ShoppingBag,
    Ticket,
    Wheat,
    XCircle,
} from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import {
    DataTable,
    EmptyState,
    PageHeader,
    type DataTableColumn,
} from '@/components/data-page';
import { DateRangeFilter } from '@/components/date-range-filter';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { todayIso } from '../pedidos/types';

type Stats = {
    monto_total: number;
    ventas_count: number;
    ticket_promedio: number;
    anuladas: number;
};

type MedioRow = { medio: string; monto: number; count: number };
type ComprobanteRow = { tipo: string; count: number; monto: number };
type ProductoRow = { nombre: string; cantidad: number; importe: number };
type InsumoFoodcostRow = {
    nombre: string;
    unidad: string | null;
    cantidad: number;
    costo: number;
};
type Foodcost = {
    costo_teorico: number;
    ventas_monto: number;
    porcentaje: number | null;
    top_insumos: InsumoFoodcostRow[];
};

type Props = {
    filters: { desde: string; hasta: string };
    stats: Stats;
    medios: MedioRow[];
    por_comprobante: ComprobanteRow[];
    top_productos: ProductoRow[];
    foodcost?: Foodcost | null;
};

function money(value: number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(value);
}

export default function ReportesIndex({
    filters,
    stats,
    medios,
    por_comprobante,
    top_productos,
    foodcost = null,
}: Props) {
    const { t } = useTranslation(['reportes', 'common']);

    const applyRange = useCallback((desde: string, hasta: string) => {
        router.get(
            '/reportes',
            { desde, hasta },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: [
                    'filters',
                    'stats',
                    'medios',
                    'por_comprobante',
                    'top_productos',
                    'foodcost',
                ],
            },
        );
    }, []);

    const clearRange = useCallback(() => {
        const day = todayIso();
        applyRange(day, day);
    }, [applyRange]);

    const medioColumns = useMemo<DataTableColumn<MedioRow>[]>(
        () => [
            {
                key: 'medio',
                header: t('reportes:columns.medio'),
                cell: (row) => (
                    <span className="font-semibold capitalize">{row.medio}</span>
                ),
            },
            {
                key: 'count',
                header: t('reportes:columns.cantidad'),
                cell: (row) => row.count,
                className: 'text-right',
            },
            {
                key: 'monto',
                header: t('reportes:columns.monto'),
                cell: (row) => money(row.monto),
                className: 'text-right font-medium',
            },
        ],
        [t],
    );

    const productoColumns = useMemo<DataTableColumn<ProductoRow>[]>(
        () => [
            {
                key: 'nombre',
                header: t('reportes:columns.producto'),
                cell: (row) => (
                    <span className="font-semibold">{row.nombre}</span>
                ),
            },
            {
                key: 'cantidad',
                header: t('reportes:columns.cantidad'),
                cell: (row) => row.cantidad,
                className: 'text-right',
            },
            {
                key: 'importe',
                header: t('reportes:columns.importe'),
                cell: (row) => money(row.importe),
                className: 'text-right font-medium',
            },
        ],
        [t],
    );

    const foodcostColumns = useMemo<DataTableColumn<InsumoFoodcostRow>[]>(
        () => [
            {
                key: 'nombre',
                header: t('reportes:columns.insumo'),
                cell: (row) => (
                    <span className="font-semibold">
                        {row.nombre}
                        {row.unidad ? (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                                ({row.unidad})
                            </span>
                        ) : null}
                    </span>
                ),
            },
            {
                key: 'cantidad',
                header: t('reportes:columns.cantidad'),
                cell: (row) => row.cantidad,
                className: 'text-right',
            },
            {
                key: 'costo',
                header: t('reportes:columns.costo'),
                cell: (row) => money(row.costo),
                className: 'text-right font-medium',
            },
        ],
        [t],
    );

    return (
        <>
            <Head title={t('reportes:title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('reportes:title')}
                    description={t('reportes:description')}
                    stats={[
                        {
                            icon: ShoppingBag,
                            label: t('reportes:stats.monto_total'),
                            value: money(stats.monto_total),
                            variant: 'primary',
                        },
                        {
                            icon: Receipt,
                            label: t('reportes:stats.ventas'),
                            value: String(stats.ventas_count),
                            variant: 'info',
                        },
                        {
                            icon: Ticket,
                            label: t('reportes:stats.ticket_promedio'),
                            value: money(stats.ticket_promedio),
                            variant: 'success',
                        },
                        {
                            icon: XCircle,
                            label: t('reportes:stats.anuladas'),
                            value: String(stats.anuladas),
                            variant: stats.anuladas > 0 ? 'danger' : 'default',
                        },
                    ]}
                    action={
                        <Can permission="reportes.export">
                            <Button
                                variant="export"
                                size="default"
                                className="cursor-pointer gap-2"
                                asChild
                            >
                                <a
                                    href={`/reportes/export?desde=${filters.desde}&hasta=${filters.hasta}`}
                                >
                                    <Download
                                        className="size-4"
                                        strokeWidth={2.5}
                                    />
                                    <span className="hidden sm:inline">
                                        {t('reportes:actions.export')}
                                    </span>
                                </a>
                            </Button>
                        </Can>
                    }
                />

                <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
                    <DateRangeFilter
                        desde={filters.desde}
                        hasta={filters.hasta}
                        onApply={applyRange}
                        onClear={clearRange}
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <section className="flex flex-col gap-3">
                        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                            <BarChart3 className="size-4 text-brand-600" />
                            {t('reportes:sections.medios')}
                        </h2>
                        <DataTable
                            columns={medioColumns}
                            data={medios}
                            rowKey={(row) => row.medio}
                            emptyState={
                                <EmptyState
                                    title={t('reportes:empty.medios')}
                                    description={t('reportes:empty.hint')}
                                />
                            }
                        />
                    </section>

                    <section className="flex flex-col gap-3">
                        <h2 className="text-sm font-semibold tracking-tight">
                            {t('reportes:sections.comprobantes')}
                        </h2>
                        {por_comprobante.length === 0 ? (
                            <EmptyState
                                title={t('reportes:empty.comprobantes')}
                                description={t('reportes:empty.hint')}
                            />
                        ) : (
                            <div className="divide-y overflow-hidden rounded-xl border">
                                {por_comprobante.map((row) => (
                                    <div
                                        key={row.tipo}
                                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                                    >
                                        <span className="font-semibold capitalize">
                                            {row.tipo}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {row.count} · {money(row.monto)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <section className="flex flex-col gap-3">
                    <h2 className="text-sm font-semibold tracking-tight">
                        {t('reportes:sections.top_productos')}
                    </h2>
                    <DataTable
                        columns={productoColumns}
                        data={top_productos}
                        rowKey={(row) => row.nombre}
                        emptyState={
                            <EmptyState
                                title={t('reportes:empty.productos')}
                                description={t('reportes:empty.hint')}
                            />
                        }
                    />
                </section>

                {foodcost ? (
                    <section className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                                <Wheat className="size-4 text-brand-600" />
                                {t('reportes:sections.foodcost')}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {t('reportes:foodcost.hint')}
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border bg-card px-4 py-3">
                                <p className="text-xs text-muted-foreground">
                                    {t('reportes:foodcost.costo_teorico')}
                                </p>
                                <p className="mt-1 text-lg font-semibold tabular-nums">
                                    {money(foodcost.costo_teorico)}
                                </p>
                            </div>
                            <div className="rounded-xl border bg-card px-4 py-3">
                                <p className="text-xs text-muted-foreground">
                                    {t('reportes:foodcost.ventas')}
                                </p>
                                <p className="mt-1 text-lg font-semibold tabular-nums">
                                    {money(foodcost.ventas_monto)}
                                </p>
                            </div>
                            <div className="rounded-xl border bg-card px-4 py-3">
                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Percent className="size-3" />
                                    {t('reportes:foodcost.porcentaje')}
                                </p>
                                <p className="mt-1 text-lg font-semibold tabular-nums">
                                    {foodcost.porcentaje != null
                                        ? `${foodcost.porcentaje}%`
                                        : '—'}
                                </p>
                            </div>
                        </div>
                        <h3 className="text-sm font-medium">
                            {t('reportes:foodcost.top_insumos')}
                        </h3>
                        <DataTable
                            columns={foodcostColumns}
                            data={foodcost.top_insumos}
                            rowKey={(row) => row.nombre}
                            emptyState={
                                <EmptyState
                                    title={t('reportes:empty.foodcost')}
                                    description={t('reportes:empty.hint')}
                                />
                            }
                        />
                    </section>
                ) : null}
            </div>
        </>
    );
}

ReportesIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Cobros' },
            { title: 'Reportes', href: '/reportes' },
        ]}
    >
        {page}
    </AppLayout>
);

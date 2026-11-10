import { Head, router } from '@inertiajs/react';
import {
    BarChart3,
    Download,
    Receipt,
    ShoppingBag,
    Ticket,
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

type Stats = {
    monto_total: number;
    ventas_count: number;
    ticket_promedio: number;
    anuladas: number;
};

type MedioRow = { medio: string; monto: number; count: number };
type ComprobanteRow = { tipo: string; count: number; monto: number };
type ProductoRow = { nombre: string; cantidad: number; importe: number };

type Props = {
    filters: { desde: string; hasta: string };
    stats: Stats;
    medios: MedioRow[];
    por_comprobante: ComprobanteRow[];
    top_productos: ProductoRow[];
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
}: Props) {
    const { t } = useTranslation(['reportes', 'common', 'nav']);

    const applyRange = useCallback((desde: string, hasta: string) => {
        router.get(
            '/reportes',
            { desde, hasta },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }, []);

    const clearRange = useCallback(() => {
        const day = new Date().toISOString().slice(0, 10);
        applyRange(day, day);
    }, [applyRange]);

    const medioColumns = useMemo<DataTableColumn<MedioRow>[]>(
        () => [
            {
                id: 'medio',
                header: t('reportes:columns.medio'),
                cell: (row) => (
                    <span className="font-medium capitalize">{row.medio}</span>
                ),
            },
            {
                id: 'count',
                header: t('reportes:columns.cantidad'),
                cell: (row) => row.count,
                className: 'text-right',
            },
            {
                id: 'monto',
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
                id: 'nombre',
                header: t('reportes:columns.producto'),
                cell: (row) => (
                    <span className="font-medium">{row.nombre}</span>
                ),
            },
            {
                id: 'cantidad',
                header: t('reportes:columns.cantidad'),
                cell: (row) => row.cantidad,
                className: 'text-right',
            },
            {
                id: 'importe',
                header: t('reportes:columns.importe'),
                cell: (row) => money(row.importe),
                className: 'text-right font-medium',
            },
        ],
        [t],
    );

    return (
        <AppLayout>
            <Head title={t('reportes:title')} />
            <div className="flex flex-col gap-4 p-4 md:p-6">
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
                        },
                        {
                            icon: Ticket,
                            label: t('reportes:stats.ticket_promedio'),
                            value: money(stats.ticket_promedio),
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
                                variant="outline"
                                size="sm"
                                className="cursor-pointer gap-2"
                                asChild
                            >
                                <a
                                    href={`/reportes/export?desde=${filters.desde}&hasta=${filters.hasta}`}
                                >
                                    <Download className="size-4" />
                                    {t('reportes:actions.export')}
                                </a>
                            </Button>
                        </Can>
                    }
                />

                <div className="flex flex-wrap items-center gap-2">
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
                            <BarChart3 className="size-4 text-[#660033]" />
                            {t('reportes:sections.medios')}
                        </h2>
                        {medios.length === 0 ? (
                            <EmptyState
                                title={t('reportes:empty.medios')}
                                description={t('reportes:empty.hint')}
                            />
                        ) : (
                            <DataTable
                                columns={medioColumns}
                                data={medios}
                                rowKey={(row) => row.medio}
                            />
                        )}
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
                            <div className="divide-y rounded-lg border">
                                {por_comprobante.map((row) => (
                                    <div
                                        key={row.tipo}
                                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                                    >
                                        <span className="capitalize font-medium">
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
                    {top_productos.length === 0 ? (
                        <EmptyState
                            title={t('reportes:empty.productos')}
                            description={t('reportes:empty.hint')}
                        />
                    ) : (
                        <DataTable
                            columns={productoColumns}
                            data={top_productos}
                            rowKey={(row) => row.nombre}
                        />
                    )}
                </section>
            </div>
        </AppLayout>
    );
}

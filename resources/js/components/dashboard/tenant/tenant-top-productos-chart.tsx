import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ChartPanel } from '@/components/dashboard/chart-panel';
import { money } from '@/components/dashboard/format';
import type { TenantDashboardData } from '@/components/dashboard/types';

type TenantTopProductosChartProps = {
    topProductos: TenantDashboardData['top_productos'];
};

export function TenantTopProductosChart({
    topProductos,
}: TenantTopProductosChartProps) {
    const { t } = useTranslation('dashboard');

    const chartData = useMemo(
        () =>
            [...topProductos].reverse().map((row) => ({
                name:
                    row.nombre.length > 18
                        ? `${row.nombre.slice(0, 18)}…`
                        : row.nombre,
                fullName: row.nombre,
                importe: row.importe,
                cantidad: row.cantidad,
            })),
        [topProductos],
    );

    return (
        <ChartPanel
            title={t('tenant.charts.top_productos')}
            description={t('tenant.charts.top_productos_hint')}
            empty={chartData.length === 0}
            emptyLabel={t('empty.chart')}
        >
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/60"
                        horizontal={false}
                    />
                    <XAxis type="number" hide />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={96}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                        formatter={(value) =>
                            money(
                                typeof value === 'number'
                                    ? value
                                    : Number(value) || 0,
                            )
                        }
                        labelFormatter={(_, payload) => {
                            const item = payload?.[0]?.payload as
                                | { fullName?: string }
                                | undefined;
                            return item?.fullName ?? '';
                        }}
                    />
                    <Bar
                        dataKey="importe"
                        fill="var(--color-chart-3)"
                        radius={[0, 6, 6, 0]}
                        maxBarSize={18}
                    />
                </BarChart>
            </ResponsiveContainer>
        </ChartPanel>
    );
}

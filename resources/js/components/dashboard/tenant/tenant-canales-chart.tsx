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
import { ChartTooltipMoney } from '@/components/dashboard/chart-tooltip-money';
import type { TenantDashboardData } from '@/components/dashboard/types';

type TenantCanalesChartProps = {
    porCanal: TenantDashboardData['por_canal'];
};

export function TenantCanalesChart({ porCanal }: TenantCanalesChartProps) {
    const { t } = useTranslation('dashboard');

    const chartData = useMemo(
        () =>
            porCanal.map((row) => ({
                name: t(`canales.${row.canal}`, { defaultValue: row.canal }),
                monto: row.monto,
                count: row.count,
            })),
        [porCanal, t],
    );

    return (
        <ChartPanel
            title={t('tenant.charts.canales')}
            description={t('tenant.charts.canales_hint')}
            empty={chartData.length === 0}
            emptyLabel={t('empty.chart')}
        >
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/60"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<ChartTooltipMoney />} />
                    <Bar
                        dataKey="monto"
                        fill="var(--color-chart-2)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                    />
                </BarChart>
            </ResponsiveContainer>
        </ChartPanel>
    );
}

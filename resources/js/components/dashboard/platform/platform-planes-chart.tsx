import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ChartPanel } from '@/components/dashboard/chart-panel';
import { CHART_COLORS } from '@/components/dashboard/format';
import type { PlatformDashboardData } from '@/components/dashboard/types';

type PlatformPlanesChartProps = {
    porPlan: PlatformDashboardData['por_plan'];
};

export function PlatformPlanesChart({ porPlan }: PlatformPlanesChartProps) {
    const { t } = useTranslation('dashboard');

    const chartData = useMemo(
        () =>
            porPlan.map((row) => ({
                name: row.plan,
                count: row.count,
                color: row.color,
            })),
        [porPlan],
    );

    return (
        <ChartPanel
            title={t('platform.charts.planes')}
            description={t('platform.charts.planes_hint')}
            empty={chartData.length === 0}
            emptyLabel={t('empty.chart')}
        >
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/60"
                        horizontal={false}
                    />
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
                        {chartData.map((row, index) => (
                            <Cell
                                key={row.name}
                                fill={
                                    row.color ||
                                    CHART_COLORS[index % CHART_COLORS.length]
                                }
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartPanel>
    );
}

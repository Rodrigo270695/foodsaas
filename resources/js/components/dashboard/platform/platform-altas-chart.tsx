import { useTranslation } from 'react-i18next';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ChartPanel } from '@/components/dashboard/chart-panel';
import type { PlatformDashboardData } from '@/components/dashboard/types';

type PlatformAltasChartProps = {
    data: PlatformDashboardData['altas_trend'];
};

export function PlatformAltasChart({ data }: PlatformAltasChartProps) {
    const { t } = useTranslation('dashboard');
    const hasAltas = data.some((d) => d.count > 0);

    return (
        <ChartPanel
            className="xl:col-span-3"
            title={t('platform.charts.altas')}
            description={t('platform.charts.altas_hint')}
            empty={!hasAltas}
            emptyLabel={t('empty.chart')}
        >
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient
                            id="altasFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor="var(--color-chart-2)"
                                stopOpacity={0.35}
                            />
                            <stop
                                offset="100%"
                                stopColor="var(--color-chart-2)"
                                stopOpacity={0.02}
                            />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/60"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tick={{ fontSize: 10 }}
                    />
                    <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                        tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="var(--color-chart-2)"
                        strokeWidth={2}
                        fill="url(#altasFill)"
                        name={t('platform.charts.altas_series')}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </ChartPanel>
    );
}

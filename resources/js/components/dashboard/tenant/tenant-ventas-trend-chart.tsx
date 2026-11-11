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
import { ChartTooltipMoney } from '@/components/dashboard/chart-tooltip-money';
import type { TenantDashboardData } from '@/components/dashboard/types';

type TenantVentasTrendChartProps = {
    data: TenantDashboardData['ventas_trend'];
};

export function TenantVentasTrendChart({ data }: TenantVentasTrendChartProps) {
    const { t } = useTranslation('dashboard');
    const hasTrend = data.some((d) => d.monto > 0);

    return (
        <ChartPanel
            className="xl:col-span-3"
            title={t('tenant.charts.ventas_trend')}
            description={t('tenant.charts.ventas_trend_hint')}
            empty={!hasTrend}
            emptyLabel={t('empty.chart')}
        >
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient
                            id="ventasFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor="var(--color-chart-1)"
                                stopOpacity={0.35}
                            />
                            <stop
                                offset="100%"
                                stopColor="var(--color-chart-1)"
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
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={56}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: number) =>
                            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                        }
                        className="fill-muted-foreground"
                    />
                    <Tooltip content={<ChartTooltipMoney />} />
                    <Area
                        type="monotone"
                        dataKey="monto"
                        stroke="var(--color-chart-1)"
                        strokeWidth={2}
                        fill="url(#ventasFill)"
                        name={t('tenant.charts.monto')}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </ChartPanel>
    );
}

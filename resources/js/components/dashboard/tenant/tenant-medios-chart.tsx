import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { ChartPanel } from '@/components/dashboard/chart-panel';
import { CHART_COLORS, money } from '@/components/dashboard/format';
import type { TenantDashboardData } from '@/components/dashboard/types';

type TenantMediosChartProps = {
    medios: TenantDashboardData['medios'];
};

export function TenantMediosChart({ medios }: TenantMediosChartProps) {
    const { t } = useTranslation('dashboard');

    const chartData = useMemo(
        () =>
            medios.map((row) => ({
                name: t(`medios.${row.medio}`, { defaultValue: row.medio }),
                value: row.monto,
                count: row.count,
            })),
        [medios, t],
    );

    return (
        <ChartPanel
            className="xl:col-span-2"
            title={t('tenant.charts.medios')}
            description={t('tenant.charts.medios_hint')}
            empty={chartData.length === 0}
            emptyLabel={t('empty.chart')}
        >
            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={3}
                        strokeWidth={0}
                    >
                        {chartData.map((_, index) => (
                            <Cell
                                key={`medio-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value) =>
                            money(
                                typeof value === 'number'
                                    ? value
                                    : Number(value) || 0,
                            )
                        }
                    />
                </PieChart>
            </ResponsiveContainer>
            <ul className="mt-1 flex flex-wrap justify-center gap-2 px-2 pb-1">
                {chartData.map((row, index) => (
                    <li
                        key={row.name}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                        <span
                            className="size-2.5 rounded-full"
                            style={{
                                background:
                                    CHART_COLORS[index % CHART_COLORS.length],
                            }}
                            aria-hidden
                        />
                        {row.name}
                    </li>
                ))}
            </ul>
        </ChartPanel>
    );
}

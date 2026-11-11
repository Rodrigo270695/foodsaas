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
import { CHART_COLORS } from '@/components/dashboard/format';
import type { PlatformDashboardData } from '@/components/dashboard/types';
import { StatBadge } from '@/components/data-page';

const ESTADO_VARIANT: Record<
    string,
    'success' | 'info' | 'warning' | 'danger' | 'muted'
> = {
    active: 'success',
    trial: 'info',
    suspended: 'warning',
    cancelled: 'danger',
    pending: 'muted',
};

type PlatformEstadosChartProps = {
    porEstado: PlatformDashboardData['por_estado'];
};

export function PlatformEstadosChart({ porEstado }: PlatformEstadosChartProps) {
    const { t } = useTranslation('dashboard');

    const chartData = useMemo(
        () =>
            porEstado.map((row) => ({
                name: t(`estados.${row.estado}`, { defaultValue: row.estado }),
                value: row.count,
                estado: row.estado,
            })),
        [porEstado, t],
    );

    const pieData = chartData.filter((r) => r.value > 0);

    return (
        <ChartPanel
            className="xl:col-span-2"
            title={t('platform.charts.estados')}
            description={t('platform.charts.estados_hint')}
            empty={pieData.length === 0}
            emptyLabel={t('empty.chart')}
        >
            <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={3}
                        strokeWidth={0}
                    >
                        {pieData.map((_, index) => (
                            <Cell
                                key={`estado-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-1.5 px-2 pb-2">
                {chartData.map((row) => (
                    <StatBadge
                        key={row.estado}
                        label={row.name}
                        value={row.value}
                        variant={ESTADO_VARIANT[row.estado] ?? 'muted'}
                    />
                ))}
            </div>
        </ChartPanel>
    );
}

import { PlatformAltasChart } from '@/components/dashboard/platform/platform-altas-chart';
import { PlatformEstadosChart } from '@/components/dashboard/platform/platform-estados-chart';
import { PlatformHeader } from '@/components/dashboard/platform/platform-header';
import { PlatformKpiGrid } from '@/components/dashboard/platform/platform-kpi-grid';
import { PlatformPlanesChart } from '@/components/dashboard/platform/platform-planes-chart';
import { PlatformRecientesList } from '@/components/dashboard/platform/platform-recientes-list';
import type { PlatformDashboardData } from '@/components/dashboard/types';

type Props = {
    data: PlatformDashboardData;
};

export function PlatformDashboard({ data }: Props) {
    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <PlatformHeader kpis={data.kpis} />
            <PlatformKpiGrid kpis={data.kpis} />
            <div className="grid gap-4 xl:grid-cols-5">
                <PlatformAltasChart data={data.altas_trend} />
                <PlatformEstadosChart porEstado={data.por_estado} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <PlatformPlanesChart porPlan={data.por_plan} />
                <PlatformRecientesList recientes={data.recientes} />
            </div>
        </div>
    );
}

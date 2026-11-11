import { TenantCanalesChart } from '@/components/dashboard/tenant/tenant-canales-chart';
import { TenantHeader } from '@/components/dashboard/tenant/tenant-header';
import { TenantKpiGrid } from '@/components/dashboard/tenant/tenant-kpi-grid';
import { TenantMediosChart } from '@/components/dashboard/tenant/tenant-medios-chart';
import { TenantOpsStrip } from '@/components/dashboard/tenant/tenant-ops-strip';
import { TenantTopProductosChart } from '@/components/dashboard/tenant/tenant-top-productos-chart';
import { TenantVentasTrendChart } from '@/components/dashboard/tenant/tenant-ventas-trend-chart';
import type { TenantDashboardData } from '@/components/dashboard/types';

type Props = {
    data: TenantDashboardData;
};

export function TenantDashboard({ data }: Props) {
    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <TenantHeader
                cajaAbierta={data.kpis.caja_abierta}
                sinSede={!data.sede_id}
            />
            <TenantKpiGrid kpis={data.kpis} />
            <TenantOpsStrip kpis={data.kpis} />
            <div className="grid gap-4 xl:grid-cols-5">
                <TenantVentasTrendChart data={data.ventas_trend} />
                <TenantMediosChart medios={data.medios} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <TenantCanalesChart porCanal={data.por_canal} />
                <TenantTopProductosChart topProductos={data.top_productos} />
            </div>
        </div>
    );
}

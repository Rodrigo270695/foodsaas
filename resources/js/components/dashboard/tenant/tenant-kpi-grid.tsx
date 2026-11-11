import {
    CircleDollarSign,
    CookingPot,
    Receipt,
    Ticket,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { money } from '@/components/dashboard/format';
import { KpiCard } from '@/components/dashboard/kpi-card';
import type { TenantDashboardData } from '@/components/dashboard/types';

type TenantKpiGridProps = {
    kpis: TenantDashboardData['kpis'];
};

export function TenantKpiGrid({ kpis }: TenantKpiGridProps) {
    const { t } = useTranslation('dashboard');

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
                icon={CircleDollarSign}
                label={t('tenant.kpis.ventas_hoy')}
                value={money(kpis.ventas_hoy)}
                deltaPct={kpis.delta_pct}
                hint={t('tenant.kpis.vs_ayer')}
                tone="brand"
                style={{ animationDelay: '0ms' }}
                className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
            />
            <KpiCard
                icon={Receipt}
                label={t('tenant.kpis.ventas_count')}
                value={String(kpis.ventas_count)}
                hint={t('tenant.kpis.tickets_hoy')}
                tone="sky"
                className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
                style={{ animationDelay: '40ms' }}
            />
            <KpiCard
                icon={Ticket}
                label={t('tenant.kpis.ticket_promedio')}
                value={money(kpis.ticket_promedio)}
                tone="emerald"
                className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
                style={{ animationDelay: '80ms' }}
            />
            <KpiCard
                icon={CookingPot}
                label={t('tenant.kpis.pedidos_abiertos')}
                value={String(kpis.pedidos_abiertos)}
                hint={t('tenant.kpis.cocina_hint', {
                    count: kpis.cocina_en_cola,
                })}
                tone={kpis.cocina_en_cola > 0 ? 'amber' : 'violet'}
                className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
                style={{ animationDelay: '120ms' }}
            />
        </div>
    );
}

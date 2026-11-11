import {
    Building2,
    CreditCard,
    Users,
    WalletCards,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { money } from '@/components/dashboard/format';
import { KpiCard } from '@/components/dashboard/kpi-card';
import type { PlatformDashboardData } from '@/components/dashboard/types';

type PlatformKpiGridProps = {
    kpis: PlatformDashboardData['kpis'];
};

export function PlatformKpiGrid({ kpis }: PlatformKpiGridProps) {
    const { t } = useTranslation('dashboard');

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
                icon={Building2}
                label={t('platform.kpis.active')}
                value={String(kpis.tenants_active)}
                hint={t('platform.kpis.active_hint')}
                tone="emerald"
            />
            <KpiCard
                icon={CreditCard}
                label={t('platform.kpis.mrr')}
                value={money(kpis.mrr)}
                hint={t('platform.kpis.mrr_hint')}
                tone="brand"
            />
            <KpiCard
                icon={Users}
                label={t('platform.kpis.users')}
                value={String(kpis.users_total)}
                hint={t('platform.kpis.users_hint')}
                tone="sky"
            />
            <KpiCard
                icon={WalletCards}
                label={t('platform.kpis.planes')}
                value={String(kpis.planes_activos)}
                hint={t('platform.kpis.planes_hint')}
                tone="violet"
            />
        </div>
    );
}

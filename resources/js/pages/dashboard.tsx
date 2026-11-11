import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import type { DashboardProps } from '@/components/dashboard/types';
import { dashboard } from '@/routes';
import { PlatformDashboard } from './dashboard/platform-dashboard';
import { TenantDashboard } from './dashboard/tenant-dashboard';

export default function Dashboard({
    mode,
    tenantMetrics,
    platformMetrics,
}: DashboardProps) {
    const { t } = useTranslation('dashboard');

    return (
        <>
            <Head
                title={
                    mode === 'platform'
                        ? t('platform.title')
                        : t('tenant.title')
                }
            />
            {mode === 'platform' && platformMetrics ? (
                <PlatformDashboard data={platformMetrics} />
            ) : mode === 'tenant' && tenantMetrics?.kpis ? (
                <TenantDashboard data={tenantMetrics} />
            ) : null}
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};

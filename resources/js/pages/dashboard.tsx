import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import type {
    DashboardPanel,
    DashboardProps,
    PlatformDashboardData,
    TenantDashboardData,
} from '@/components/dashboard/types';
import { dashboard } from '@/routes';
import { PlatformDashboard } from './dashboard/platform-dashboard';
import { TenantDashboard } from './dashboard/tenant-dashboard';

function isTenantMetrics(value: unknown): value is TenantDashboardData {
    if (typeof value !== 'object' || value === null || !('kpis' in value)) {
        return false;
    }
    const kpis = (value as TenantDashboardData).kpis;
    return (
        typeof kpis === 'object' &&
        kpis !== null &&
        'caja_abierta' in kpis &&
        'ventas_hoy' in kpis
    );
}

function isPlatformMetrics(value: unknown): value is PlatformDashboardData {
    if (typeof value !== 'object' || value === null || !('kpis' in value)) {
        return false;
    }
    const kpis = (value as PlatformDashboardData).kpis;
    return (
        typeof kpis === 'object' &&
        kpis !== null &&
        'tenants_total' in kpis
    );
}

function resolvePanel(
    props: DashboardProps & Record<string, unknown>,
    page: Record<string, unknown>,
): DashboardPanel | null {
    const raw = (props.panel ?? page.panel) as unknown;

    if (typeof raw === 'object' && raw !== null && 'mode' in raw) {
        const panel = raw as DashboardPanel;
        return {
            mode: panel.mode === 'platform' ? 'platform' : 'tenant',
            tenant: isTenantMetrics(panel.tenant) ? panel.tenant : null,
            platform: isPlatformMetrics(panel.platform) ? panel.platform : null,
        };
    }

    // Compat builds previos (tenantMetrics / platformMetrics).
    const mode =
        (props as { mode?: string }).mode ??
        (page.mode as string | undefined) ??
        'tenant';
    const tenantCandidate =
        (props as { tenantMetrics?: unknown }).tenantMetrics ??
        page.tenantMetrics;
    const platformCandidate =
        (props as { platformMetrics?: unknown }).platformMetrics ??
        page.platformMetrics;

    return {
        mode: mode === 'platform' ? 'platform' : 'tenant',
        tenant: isTenantMetrics(tenantCandidate) ? tenantCandidate : null,
        platform: isPlatformMetrics(platformCandidate)
            ? platformCandidate
            : null,
    };
}

export default function Dashboard(props: DashboardProps) {
    const { t } = useTranslation('dashboard');
    const page = usePage().props as Record<string, unknown>;
    const panel = resolvePanel(props, page);

    const showPlatform =
        panel?.mode === 'platform' && panel.platform !== null;

    return (
        <>
            <Head
                title={
                    showPlatform ? t('platform.title') : t('tenant.title')
                }
            />
            {showPlatform && panel?.platform ? (
                <PlatformDashboard data={panel.platform} />
            ) : panel?.tenant ? (
                <TenantDashboard data={panel.tenant} />
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                    <p className="text-sm font-medium text-foreground">
                        {t('empty.unavailable_title')}
                    </p>
                    <p className="max-w-md text-sm text-muted-foreground">
                        {t('empty.unavailable_hint')}
                    </p>
                </div>
            )}
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

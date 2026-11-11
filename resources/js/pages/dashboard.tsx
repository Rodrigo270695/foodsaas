import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import type {
    DashboardProps,
    PlatformDashboardData,
    TenantDashboardData,
} from '@/components/dashboard/types';
import { dashboard } from '@/routes';
import { PlatformDashboard } from './dashboard/platform-dashboard';
import { TenantDashboard } from './dashboard/tenant-dashboard';

type PageProps = DashboardProps & {
    // Compat: builds/backends antiguos
    tenant?: TenantDashboardData | null;
    platform?: PlatformDashboardData | null;
};

function isTenantMetrics(
    value: unknown,
): value is TenantDashboardData {
    return (
        typeof value === 'object' &&
        value !== null &&
        'kpis' in value &&
        typeof (value as TenantDashboardData).kpis === 'object' &&
        (value as TenantDashboardData).kpis !== null &&
        'ventas_hoy' in (value as TenantDashboardData).kpis
    );
}

function isPlatformMetrics(
    value: unknown,
): value is PlatformDashboardData {
    return (
        typeof value === 'object' &&
        value !== null &&
        'kpis' in value &&
        typeof (value as PlatformDashboardData).kpis === 'object' &&
        (value as PlatformDashboardData).kpis !== null &&
        'tenants_total' in (value as PlatformDashboardData).kpis
    );
}

export default function Dashboard(props: PageProps) {
    const { t } = useTranslation('dashboard');
    const page = usePage<PageProps>().props;

    const mode = props.mode ?? page.mode;
    const tenantMetricsCandidate =
        props.tenantMetrics ?? page.tenantMetrics ?? props.tenant ?? page.tenant;
    const platformMetricsCandidate =
        props.platformMetrics ??
        page.platformMetrics ??
        props.platform ??
        page.platform;

    const tenantMetrics = isTenantMetrics(tenantMetricsCandidate)
        ? tenantMetricsCandidate
        : null;
    const platformMetrics = isPlatformMetrics(platformMetricsCandidate)
        ? platformMetricsCandidate
        : null;

    const showPlatform =
        mode === 'platform' ||
        (platformMetrics !== null && tenantMetrics === null);

    return (
        <>
            <Head
                title={
                    showPlatform ? t('platform.title') : t('tenant.title')
                }
            />
            {showPlatform && platformMetrics ? (
                <PlatformDashboard data={platformMetrics} />
            ) : tenantMetrics ? (
                <TenantDashboard data={tenantMetrics} />
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                    <p className="text-sm font-medium text-foreground">
                        {t('empty.unavailable_title', {
                            defaultValue: 'No se pudieron cargar las métricas',
                        })}
                    </p>
                    <p className="max-w-md text-sm text-muted-foreground">
                        {t('empty.unavailable_hint', {
                            defaultValue:
                                'Recarga la página. Si el problema continúa, vuelve a compilar el frontend (pnpm build).',
                        })}
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

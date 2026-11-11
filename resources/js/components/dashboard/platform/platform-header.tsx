import { Link } from '@inertiajs/react';
import { Building2, PauseCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PlatformDashboardData } from '@/components/dashboard/types';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';

type PlatformHeaderProps = {
    kpis: PlatformDashboardData['kpis'];
};

export function PlatformHeader({ kpis }: PlatformHeaderProps) {
    const { t } = useTranslation('dashboard');

    return (
        <PageHeader
            title={t('platform.title')}
            description={t('platform.description')}
            stats={[
                {
                    icon: Building2,
                    label: t('platform.stats.total'),
                    value: kpis.tenants_total,
                    variant: 'primary',
                },
                {
                    icon: Sparkles,
                    label: t('platform.stats.trial'),
                    value: kpis.tenants_trial,
                    variant: 'info',
                },
                {
                    icon: PauseCircle,
                    label: t('platform.stats.suspended'),
                    value: kpis.tenants_suspended,
                    variant: kpis.tenants_suspended > 0 ? 'warning' : 'muted',
                },
            ]}
            action={
                <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    asChild
                >
                    <Link href="/plataforma/tenants">
                        {t('actions.tenants')}
                    </Link>
                </Button>
            }
        />
    );
}

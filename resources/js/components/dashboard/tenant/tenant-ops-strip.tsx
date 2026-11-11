import { ChefHat, LayoutGrid, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TenantDashboardData } from '@/components/dashboard/types';

type TenantOpsStripProps = {
    kpis: TenantDashboardData['kpis'];
};

export function TenantOpsStrip({ kpis }: TenantOpsStripProps) {
    const { t } = useTranslation('dashboard');

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    <ChefHat className="size-4" aria-hidden />
                </span>
                <div>
                    <p className="text-xs text-muted-foreground">
                        {t('tenant.ops.cocina')}
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                        {kpis.cocina_en_cola}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                    <LayoutGrid className="size-4" aria-hidden />
                </span>
                <div>
                    <p className="text-xs text-muted-foreground">
                        {t('tenant.ops.mesas')}
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                        {kpis.mesas_ocupadas}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm sm:col-span-2 xl:col-span-1">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600 dark:text-brand-400">
                    <Wallet className="size-4" aria-hidden />
                </span>
                <div>
                    <p className="text-xs text-muted-foreground">
                        {t('tenant.ops.caja')}
                    </p>
                    <p className="text-lg font-semibold">
                        {kpis.caja_abierta
                            ? t('tenant.caja_abierta')
                            : t('tenant.caja_cerrada')}
                    </p>
                </div>
            </div>
        </div>
    );
}

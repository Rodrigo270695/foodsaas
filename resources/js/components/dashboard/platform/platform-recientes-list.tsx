import { useTranslation } from 'react-i18next';
import { ChartPanel } from '@/components/dashboard/chart-panel';
import type { PlatformDashboardData } from '@/components/dashboard/types';
import { Badge } from '@/components/ui/badge';

type PlatformRecientesListProps = {
    recientes: PlatformDashboardData['recientes'];
};

export function PlatformRecientesList({
    recientes,
}: PlatformRecientesListProps) {
    const { t } = useTranslation('dashboard');

    return (
        <ChartPanel
            title={t('platform.recientes.title')}
            description={t('platform.recientes.hint')}
            empty={recientes.length === 0}
            emptyLabel={t('empty.list')}
            bodyClassName="p-0"
        >
            <ul className="divide-y divide-border/60">
                {recientes.map((tenant) => (
                    <li
                        key={tenant.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                                {tenant.nombre}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                {tenant.slug}
                                {tenant.plan ? ` · ${tenant.plan}` : ''}
                            </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 capitalize">
                            {t(`estados.${tenant.estado}`, {
                                defaultValue: tenant.estado,
                            })}
                        </Badge>
                    </li>
                ))}
            </ul>
        </ChartPanel>
    );
}

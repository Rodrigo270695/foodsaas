import { Link } from '@inertiajs/react';
import { Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/data-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type TenantHeaderProps = {
    cajaAbierta: boolean;
    sinSede: boolean;
};

export function TenantHeader({ cajaAbierta, sinSede }: TenantHeaderProps) {
    const { t } = useTranslation('dashboard');

    return (
        <>
            <PageHeader
                title={t('tenant.title')}
                description={t('tenant.description')}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant={cajaAbierta ? 'default' : 'secondary'}
                            className="gap-1.5"
                        >
                            <Wallet className="size-3.5" aria-hidden />
                            {cajaAbierta
                                ? t('tenant.caja_abierta')
                                : t('tenant.caja_cerrada')}
                        </Badge>
                        <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            asChild
                        >
                            <Link href="/reportes">{t('actions.reportes')}</Link>
                        </Button>
                    </div>
                }
            />

            {sinSede ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
                    {t('tenant.no_sede')}
                </div>
            ) : null}
        </>
    );
}

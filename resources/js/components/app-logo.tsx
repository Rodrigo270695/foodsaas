import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLogoIcon from '@/components/app-logo-icon';
import { ClinicLogoMark } from '@/components/clinic-logo-mark';
import { useClinicBranding } from '@/hooks/use-clinic-branding';
import type { TenantShared } from '@/types/tenancy';

export default function AppLogo() {
    const page = usePage();
    const tenant = page.props.tenant as TenantShared | null;
    const branding = useClinicBranding();
    const { t } = useTranslation('nav');
    const fallbackName = page.props.name as string;
    const brandTitle = tenant
        ? (tenant.nombre_comercial || tenant.razon_social).trim() || fallbackName
        : fallbackName;

    return (
        <>
            {tenant ? (
                <ClinicLogoMark
                    key={branding?.updated_at ?? 'default'}
                    logoUrl={branding?.logo_url}
                    className="size-8 rounded-md"
                />
            ) : (
                <AppLogoIcon className="size-8 shrink-0 rounded-md object-contain" />
            )}
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold tracking-tight">
                    {brandTitle}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                    {t('brand_tagline')}
                </span>
            </div>
        </>
    );
}

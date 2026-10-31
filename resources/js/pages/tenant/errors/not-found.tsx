import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HttpErrorPage } from '@/components/errors/http-error-page';
import { useTenancy } from '@/lib/tenancy-url';

type NotFoundProps = {
    slug: string;
    central_url?: string | null;
};

export default function TenantNotFound({ slug, central_url }: NotFoundProps) {
    const { t } = useTranslation('common');
    const tenancy = useTenancy();
    const centralUrl =
        central_url?.trim() ||
        `${tenancy.scheme}://${tenancy.root_domain}`;

    return (
        <HttpErrorPage
            status={404}
            icon={Building2}
            title={t('http_errors.tenant_not_found.title')}
            description={t('http_errors.tenant_not_found.description', {
                slug,
            })}
            helper={t('http_errors.tenant_not_found.helper')}
            attempted_path={slug}
            pathLabel={t('http_errors.tenant_not_found.slug_label')}
            message={t('http_errors.tenant_not_found.message', { slug })}
            primaryHref={centralUrl}
            primaryLabel={t('http_errors.tenant_not_found.cta_central')}
            primaryExternal
        />
    );
}

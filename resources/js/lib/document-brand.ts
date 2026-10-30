import { router } from '@inertiajs/react';
import type { TenantShared } from '@/types/tenancy';

const FALLBACK_APP_NAME = import.meta.env.VITE_APP_NAME || 'FoodSaaS';

type InertiaPageLike = {
    props?: {
        tenant?: TenantShared | null;
        name?: string;
    };
};

/**
 * Marca para `<title>` / PDF: en tenant usa nombre comercial (o razón social);
 * en central, el nombre de la app.
 */
export function resolveDocumentBrand(): string {
    if (typeof window === 'undefined') {
        return FALLBACK_APP_NAME;
    }

    const page = (router as unknown as { page?: InertiaPageLike }).page;
    const tenant = page?.props?.tenant ?? null;

    if (tenant) {
        const label = (
            tenant.nombre_comercial ||
            tenant.razon_social ||
            ''
        ).trim();

        if (label !== '') {
            return label;
        }
    }

    const sharedName =
        typeof page?.props?.name === 'string' ? page.props.name.trim() : '';

    return sharedName !== '' ? sharedName : FALLBACK_APP_NAME;
}

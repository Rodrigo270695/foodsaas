import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;
    const { t } = useTranslation('nav');

    return (
        <>
            <AppLogoIcon className="size-8 shrink-0 rounded-md object-contain" />
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold tracking-tight">
                    {name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                    {t('brand_tagline')}
                </span>
            </div>
        </>
    );
}

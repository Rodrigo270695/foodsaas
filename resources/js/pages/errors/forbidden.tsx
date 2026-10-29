import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

type Props = {
    message?: string | null;
};

export default function Forbidden({ message }: Props) {
    const { t } = useTranslation('common');

    return (
        <>
            <Head title={t('errors.forbidden_title')} />
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
                <h1 className="text-2xl font-semibold">
                    {t('errors.forbidden_title')}
                </h1>
                <p className="max-w-md text-muted-foreground">
                    {message ?? t('errors.forbidden_body')}
                </p>
            </div>
        </>
    );
}

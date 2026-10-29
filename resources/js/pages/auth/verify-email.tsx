import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AuthStatus from '@/components/auth/auth-status';
import VerifyEmailForm from '@/components/auth/verify-email-form';

type Props = {
    status?: string;
};

export default function VerifyEmail({ status }: Props) {
    const { t } = useTranslation('auth');

    return (
        <>
            <Head title={t('verify_email.title')} />

            {status === 'verification-link-sent' && (
                <AuthStatus variant="success">
                    {t('verify_email.link_sent')}
                </AuthStatus>
            )}

            <VerifyEmailForm />
        </>
    );
}

VerifyEmail.layout = { editorialKey: 'verify_email' };

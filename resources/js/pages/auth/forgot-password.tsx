import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AuthStatus from '@/components/auth/auth-status';
import ForgotPasswordForm from '@/components/auth/forgot-password-form';

type Props = {
    status?: string;
};

export default function ForgotPassword({ status }: Props) {
    const { t } = useTranslation('auth');

    return (
        <>
            <Head title={t('forgot_password.title')} />

            {status && <AuthStatus variant="success">{status}</AuthStatus>}

            <ForgotPasswordForm />
        </>
    );
}

ForgotPassword.layout = { editorialKey: 'forgot_password' };

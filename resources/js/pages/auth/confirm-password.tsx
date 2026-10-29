import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import ConfirmPasswordForm from '@/components/auth/confirm-password-form';

export default function ConfirmPassword() {
    const { t } = useTranslation('auth');

    return (
        <>
            <Head title={t('confirm_password.title')} />

            <ConfirmPasswordForm />
        </>
    );
}

ConfirmPassword.layout = { editorialKey: 'confirm_password' };

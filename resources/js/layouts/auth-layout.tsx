import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AuthLayoutTemplate from '@/layouts/auth/auth-split-layout';
import {
    AUTH_PAGE_EDITORIAL,
    type AuthEditorialKey,
} from '@/lib/auth-editorial';

export default function AuthLayout({
    title: _title,
    description: _description,
    editorialKey: editorialKeyProp,
    children,
}: {
    title?: string;
    description?: string;
    editorialKey?: string;
    children: React.ReactNode;
}) {
    const page = usePage();
    const { t, i18n } = useTranslation('auth');

    const editorialKey = useMemo(() => {
        const fromProps = editorialKeyProp as AuthEditorialKey | undefined;
        const fromPage =
            AUTH_PAGE_EDITORIAL[page.component as string] as
                | AuthEditorialKey
                | undefined;
        return fromProps ?? fromPage ?? 'login';
    }, [editorialKeyProp, page.component, i18n.language]);

    const title = t(`editorial.${editorialKey}.title`);
    const description = t(`editorial.${editorialKey}.description`);

    return (
        <AuthLayoutTemplate title={title} description={description}>
            {children}
        </AuthLayoutTemplate>
    );
}

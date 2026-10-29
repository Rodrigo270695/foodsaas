import { usePage } from '@inertiajs/react';
import AuthAuroraBackground from '@/components/auth/auth-aurora-background';
import AuthBentoOrbit from '@/components/auth/auth-bento-orbit';
import AuthFooter from '@/components/auth/auth-footer';
import AuthFormCard from '@/components/auth/auth-form-card';
import AuthGreeting from '@/components/auth/auth-greeting';
import AuthHeader from '@/components/auth/auth-header';
import { useClinicBranding } from '@/hooks/use-clinic-branding';
import type { AuthLayoutProps } from '@/types';

const PAGES_WITH_OWN_CARD = new Set([
    'auth/login',
    'errors/forbidden',
    'errors/not-found',
    'errors/server-error',
    'errors/method-not-allowed',
    'tenant/errors/blocked',
]);

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const page = usePage();
    const brandName = page.props.name as string;
    const branding = useClinicBranding();
    const skipFormCard = PAGES_WITH_OWN_CARD.has(page.component);
    const isLogin = page.component === 'auth/login';

    return (
        <div className="relative isolate flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
            <AuthAuroraBackground />
            <AuthHeader
                brandName={brandName}
                logoUrl={branding?.logo_url}
                logoKey={branding?.updated_at ?? undefined}
            />

            <main
                className={
                    isLogin
                        ? 'relative z-10 flex flex-1 items-start justify-center px-4 pt-0 pb-6 sm:items-center sm:py-4 lg:py-6'
                        : 'relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:py-12 lg:py-16'
                }
            >
                <AuthBentoOrbit />

                <article className="relative z-10 mx-auto w-full max-w-md">
                    <AuthGreeting
                        compact={isLogin}
                        title={title}
                        description={description}
                    />
                    {skipFormCard ? children : <AuthFormCard>{children}</AuthFormCard>}
                </article>
            </main>

            <AuthFooter brandName={brandName} />
        </div>
    );
}

import { createInertiaApp, router } from '@inertiajs/react';
import AuthLoginLoader from '@/components/auth/auth-login-loader';
import PwaInstallBanner from '@/components/pwa-install-banner';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { capturePwaInstallPrompt } from '@/lib/pwa-install';
import { recoverPwaBoot } from '@/lib/pwa-boot';
import '@/lib/i18n';

const appName = import.meta.env.VITE_APP_NAME || 'FoodSaaS';

if (typeof window !== 'undefined') {
    initializeTheme();
    capturePwaInstallPrompt();
    recoverPwaBoot();
}

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            case name.startsWith('errors/'):
                return AuthLayout;
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <AuthLoginLoader />
                <PwaInstallBanner />
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#660033',
    },
});

(router.on as (event: 'invalid', handler: () => void) => void)('invalid', () => {
    if (typeof window !== 'undefined') {
        window.location.reload();
    }
});

if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const message =
            typeof reason === 'string'
                ? reason
                : reason instanceof Error
                  ? reason.message
                  : '';

        if (
            message.includes('Failed to fetch dynamically imported module') ||
            message.includes('Importing a module script failed') ||
            message.includes('error loading dynamically imported module')
        ) {
            event.preventDefault();
            window.location.reload();
        }
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    void registration.update();
                })
                .catch(() => {
                    /* sin SW la app sigue funcionando */
                });
        });
    }
}

import { router } from '@inertiajs/react';
import { Check, Copy, Download, Share2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import {
    OPEN_PWA_INSTALL_HELP_EVENT,
    isAndroidDevice,
    isIosChromeLike,
    isIosDevice,
    isStandaloneDisplay,
    promptPwaInstall,
    subscribePwaInstallPrompt,
} from '@/lib/pwa-install';

const DISMISS_KEY = 'foodsaas-pwa-install-dismiss-until';
const DISMISS_MS = 24 * 60 * 60 * 1000;

const HIDE_PATH_PREFIXES = [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/two-factor-challenge',
    '/user/confirm-password',
] as const;

function shouldHideBanner(pathname: string): boolean {
    const p = pathname.split('?')[0] ?? '';
    return HIDE_PATH_PREFIXES.some(
        (prefix) => p === prefix || p.startsWith(`${prefix}/`),
    );
}

function readDismissedUntil(): number {
    try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (!raw) {
            return 0;
        }
        return Number.parseInt(raw, 10) || 0;
    } catch {
        return 0;
    }
}

function writeDismissed(): void {
    try {
        localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    } catch {
        /* ignore */
    }
}

function clearDismissed(): void {
    try {
        localStorage.removeItem(DISMISS_KEY);
    } catch {
        /* ignore */
    }
}

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PwaInstallBanner() {
    const { t } = useTranslation('common');
    const appLabel = import.meta.env.VITE_APP_NAME || 'FoodSaaS';

    const [pathname, setPathname] = useState(() =>
        typeof window === 'undefined' ? '' : window.location.pathname,
    );
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
        null,
    );
    const [dismissed, setDismissed] = useState(false);
    const [ios, setIos] = useState(false);
    const [iosChrome, setIosChrome] = useState(false);
    const [android, setAndroid] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [copied, setCopied] = useState(false);
    const [forced, setForced] = useState(false);

    useEffect(() => {
        const until = readDismissedUntil();
        if (until > Date.now()) {
            setDismissed(true);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const updatePath = () => setPathname(window.location.pathname);

        setIos(isIosDevice());
        setIosChrome(isIosChromeLike());
        setAndroid(isAndroidDevice());

        const unsubNavigate = router.on('navigate', updatePath);
        window.addEventListener('popstate', updatePath);

        const unsub = subscribePwaInstallPrompt((event) => {
            setDeferred(event);
            if (event === null && isStandaloneDisplay()) {
                setDismissed(true);
            }
        });
        const onInstalled = () => {
            setDeferred(null);
            setDismissed(true);
        };
        const onHelp = () => {
            clearDismissed();
            setDismissed(false);
            setForced(true);
        };
        window.addEventListener('appinstalled', onInstalled);
        window.addEventListener(OPEN_PWA_INSTALL_HELP_EVENT, onHelp);

        return () => {
            unsubNavigate();
            window.removeEventListener('popstate', updatePath);
            window.removeEventListener('appinstalled', onInstalled);
            window.removeEventListener(OPEN_PWA_INSTALL_HELP_EVENT, onHelp);
            unsub();
        };
    }, []);

    const onDismiss = useCallback(() => {
        writeDismissed();
        setDismissed(true);
        setForced(false);
    }, []);

    const onInstallClick = useCallback(async () => {
        setInstalling(true);
        try {
            await promptPwaInstall();
        } finally {
            setInstalling(false);
        }
    }, []);

    const copySiteUrl = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(window.location.origin);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch {
            setCopied(false);
        }
    }, []);

    if (isStandaloneDisplay()) {
        return null;
    }

    if (!forced && (dismissed || shouldHideBanner(pathname))) {
        return null;
    }

    const showChromiumInstall = Boolean(deferred);
    const showIosHint = ios;
    const showAndroidHint = android && !showChromiumInstall;
    const showHelp =
        showChromiumInstall || showIosHint || showAndroidHint || forced;

    if (!showHelp) {
        return null;
    }

    return (
        <div
            className={cn(
                'fixed right-0 bottom-0 left-0 z-40 border-t border-border/70 bg-background/95 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_28px_rgba(0,0,0,0.12)] backdrop-blur-md supports-backdrop-filter:bg-background/90',
                'px-4',
            )}
            role="region"
            aria-label={t('pwa.region_label')}
        >
            <div className="mx-auto flex max-w-lg items-start gap-3">
                <div
                    className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"
                    aria-hidden
                >
                    {showIosHint && !showChromiumInstall ? (
                        <Share2 className="size-4" />
                    ) : (
                        <Download className="size-4" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    {showChromiumInstall ? (
                        <>
                            <p className="text-sm leading-snug font-semibold text-foreground">
                                {t('pwa.chromium_title', { app: appLabel })}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                {t('pwa.chromium_body')}
                            </p>
                            <button
                                type="button"
                                className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 sm:w-auto"
                                onClick={onInstallClick}
                                disabled={installing}
                            >
                                {installing
                                    ? t('pwa.installing')
                                    : t('pwa.install_now')}
                            </button>
                        </>
                    ) : showIosHint ? (
                        iosChrome ? (
                            <>
                                <p className="text-sm leading-snug font-semibold text-foreground">
                                    {t('pwa.ios_chrome_title')}
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                    {t('pwa.ios_chrome_body')}
                                </p>
                                <button
                                    type="button"
                                    className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
                                    onClick={() => void copySiteUrl()}
                                >
                                    {copied ? (
                                        <Check className="size-4" />
                                    ) : (
                                        <Copy className="size-4" />
                                    )}
                                    {copied
                                        ? t('pwa.link_copied')
                                        : t('pwa.copy_link')}
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-sm leading-snug font-semibold text-foreground">
                                    {t('pwa.ios_safari_title', { app: appLabel })}
                                </p>
                                <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
                                    <li>{t('pwa.ios_safari_step1')}</li>
                                    <li>{t('pwa.ios_safari_step2')}</li>
                                    <li>{t('pwa.ios_safari_step3')}</li>
                                </ol>
                            </>
                        )
                    ) : (
                        <>
                            <p className="text-sm leading-snug font-semibold text-foreground">
                                {t('pwa.android_title', { app: appLabel })}
                            </p>
                            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
                                <li>{t('pwa.android_step1')}</li>
                                <li>{t('pwa.android_step2')}</li>
                            </ol>
                        </>
                    )}
                </div>
                <button
                    type="button"
                    className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onClick={onDismiss}
                    aria-label={t('pwa.dismiss')}
                >
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}

export function PwaInstallHeaderButton() {
    const { t } = useTranslation('common');
    const [show, setShow] = useState(false);

    useEffect(() => {
        setShow(!isStandaloneDisplay());
    }, []);

    if (!show) {
        return null;
    }

    return (
        <button
            type="button"
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md text-primary hover:bg-primary/10 sm:h-9 sm:w-auto sm:px-2.5 lg:hidden"
            onClick={() => {
                window.dispatchEvent(new Event(OPEN_PWA_INSTALL_HELP_EVENT));
            }}
            aria-label={t('pwa.header_button')}
        >
            <Download className="size-4" strokeWidth={2.25} />
            <span className="hidden text-xs font-medium sm:inline">
                {t('pwa.header_short')}
            </span>
        </button>
    );
}

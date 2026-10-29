import { Check, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    LOCALE_STORAGE_KEY,
    SUPPORTED_LOCALES,
    type SupportedLocale,
} from '@/lib/i18n';
import { cn } from '@/lib/utils';

const LOCALE_LABELS: Record<SupportedLocale, { native: string; flag: string }> = {
    es: { native: 'Español', flag: '🇪🇸' },
    en: { native: 'English', flag: '🇬🇧' },
};

export type LanguageSwitcherProps = {
    size?: 'sm' | 'icon';
    compact?: boolean;
    /** Mismo aspecto que `ThemeToggle` en pantallas de auth. */
    variant?: 'default' | 'auth';
};

export function LanguageSwitcher({
    size = 'sm',
    compact = false,
    variant = 'default',
}: LanguageSwitcherProps) {
    const { i18n, t } = useTranslation('common');
    const current = (i18n.language?.split('-')[0] ?? 'es') as SupportedLocale;
    const currentLabel = LOCALE_LABELS[current] ?? LOCALE_LABELS.es;

    const handleSelect = (locale: SupportedLocale) => {
        void i18n.changeLanguage(locale);
        try {
            window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
        } catch {
            // ignore
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant={variant === 'auth' ? 'outline' : 'ghost'}
                    size={compact ? 'icon' : size}
                    aria-label={t('language.label')}
                    className={cn(
                        'cursor-pointer gap-2',
                        variant === 'auth' &&
                            'size-9 shrink-0 rounded-full border-border/70 bg-card/70 text-muted-foreground shadow-none backdrop-blur hover:border-primary/40 hover:bg-card/70 hover:text-foreground',
                    )}
                >
                    <Globe className="size-4" strokeWidth={2.25} />
                    {!compact && (
                        <span className="text-xs font-medium tabular-nums">
                            {currentLabel.flag}{' '}
                            <span className="uppercase">{current}</span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">
                    {t('language.label')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SUPPORTED_LOCALES.map((locale) => {
                    const label = LOCALE_LABELS[locale];
                    const isActive = locale === current;

                    return (
                        <DropdownMenuItem
                            key={locale}
                            onSelect={() => handleSelect(locale)}
                            className="cursor-pointer justify-between gap-2"
                        >
                            <span className="flex items-center gap-2">
                                <span aria-hidden>{label.flag}</span>
                                <span>{label.native}</span>
                            </span>
                            {isActive && (
                                <Check
                                    className="size-4 text-primary"
                                    strokeWidth={2.5}
                                    aria-hidden
                                />
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

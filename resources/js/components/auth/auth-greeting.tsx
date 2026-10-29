import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TypingAnimation } from '@/components/ui/typing-animation';

type AuthGreetingProps = {
    title?: string;
    description?: string;
    compact?: boolean;
    overrideGreeting?: string;
};

function pickGreetingKey(hour: number): 'night' | 'morning' | 'afternoon' {
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 19) return 'afternoon';
    return 'night';
}

export default function AuthGreeting({
    title,
    description,
    compact = false,
    overrideGreeting,
}: AuthGreetingProps) {
    const { t, i18n } = useTranslation('auth');
    const greeting = useMemo(() => {
        if (overrideGreeting) {
            return overrideGreeting;
        }
        return t(`greeting.${pickGreetingKey(new Date().getHours())}`);
    }, [overrideGreeting, t, i18n.language]);
    const headline = title ?? t('greeting.default_headline');
    const greetingLine = `${greeting},`;
    const typeSpeed = 58;
    const headlineDelay = 280 + greetingLine.length * typeSpeed;

    return (
        <header
            className={
                compact
                    ? 'mb-5 space-y-1.5 text-center sm:mb-6 sm:space-y-2'
                    : 'mb-8 space-y-3 text-center sm:mb-10'
            }
        >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase backdrop-blur">
                <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-1.5 animate-ping rounded-full bg-success/60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                </span>
                {t('greeting.status_pill')}
            </span>
            <h1
                key={`${greeting}-${headline}`}
                className={
                    compact
                        ? 'text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl'
                        : 'text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl'
                }
            >
                <TypingAnimation typeSpeed={typeSpeed} delay={180}>
                    {greetingLine}
                </TypingAnimation>
                <span className="block bg-linear-to-br from-brand-700 to-brand-500 bg-clip-text text-transparent dark:from-brand-300 dark:to-brand-200">
                    <TypingAnimation
                        typeSpeed={typeSpeed}
                        delay={headlineDelay}
                        className="bg-linear-to-br from-brand-700 to-brand-500 bg-clip-text text-transparent dark:from-brand-300 dark:to-brand-200"
                    >
                        {headline}
                    </TypingAnimation>
                </span>
            </h1>
            {description && (
                <p
                    key={description}
                    className="animate-in fade-in text-pretty text-sm text-muted-foreground duration-500"
                >
                    {description}
                </p>
            )}
        </header>
    );
}

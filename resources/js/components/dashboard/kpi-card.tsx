import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'brand' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet';

const toneStyles: Record<
    Tone,
    { icon: string; ring: string; wash: string }
> = {
    brand: {
        icon: 'bg-brand-600/10 text-brand-600 dark:text-brand-400',
        ring: 'ring-brand-600/15',
        wash: 'from-brand-600/8 to-transparent',
    },
    emerald: {
        icon: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        ring: 'ring-emerald-500/15',
        wash: 'from-emerald-500/8 to-transparent',
    },
    sky: {
        icon: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
        ring: 'ring-sky-500/15',
        wash: 'from-sky-500/8 to-transparent',
    },
    amber: {
        icon: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
        ring: 'ring-amber-500/15',
        wash: 'from-amber-500/8 to-transparent',
    },
    rose: {
        icon: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
        ring: 'ring-rose-500/15',
        wash: 'from-rose-500/8 to-transparent',
    },
    violet: {
        icon: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
        ring: 'ring-violet-500/15',
        wash: 'from-violet-500/8 to-transparent',
    },
};

export type KpiCardProps = {
    label: string;
    value: string;
    hint?: string;
    icon: LucideIcon;
    tone?: Tone;
    deltaPct?: number | null;
    className?: string;
    style?: CSSProperties;
};

export function KpiCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'brand',
    deltaPct = null,
    className,
    style,
}: KpiCardProps) {
    const styles = toneStyles[tone];
    const deltaPositive = deltaPct !== null && deltaPct >= 0;

    return (
        <article
            className={cn(
                'relative overflow-hidden rounded-xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-inset transition-colors duration-200',
                styles.ring,
                className,
            )}
            style={style}
        >
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b',
                    styles.wash,
                )}
            />
            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {label}
                    </p>
                    <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                        {value}
                    </p>
                </div>
                <span
                    className={cn(
                        'inline-flex size-10 shrink-0 items-center justify-center rounded-lg',
                        styles.icon,
                    )}
                >
                    <Icon className="size-5" strokeWidth={2.25} aria-hidden />
                </span>
            </div>
            {(hint || deltaPct !== null) && (
                <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {deltaPct !== null ? (
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium tabular-nums',
                                deltaPositive
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
                            )}
                        >
                            {deltaPositive ? (
                                <TrendingUp className="size-3.5" aria-hidden />
                            ) : (
                                <TrendingDown className="size-3.5" aria-hidden />
                            )}
                            {deltaPositive ? '+' : ''}
                            {deltaPct.toFixed(1)}%
                        </span>
                    ) : null}
                    {hint ? <span>{hint}</span> : null}
                </div>
            )}
        </article>
    );
}

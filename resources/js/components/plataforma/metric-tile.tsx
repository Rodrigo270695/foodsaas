import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONE = {
    brand: 'from-brand-600/15 via-brand-500/5 to-transparent text-brand-700 dark:text-brand-200',
    success:
        'from-emerald-500/15 via-emerald-500/5 to-transparent text-emerald-700 dark:text-emerald-300',
    warning:
        'from-amber-500/15 via-amber-500/5 to-transparent text-amber-700 dark:text-amber-300',
    info: 'from-sky-500/15 via-sky-500/5 to-transparent text-sky-700 dark:text-sky-300',
    muted: 'from-muted via-transparent to-transparent text-foreground',
} as const;

type Tone = keyof typeof TONE;

type Props = {
    label: string;
    value: string | number;
    hint?: string;
    icon?: LucideIcon;
    tone?: Tone;
    className?: string;
    style?: React.CSSProperties;
};

export function MetricTile({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'muted',
    className,
    style,
}: Props) {
    return (
        <div
            className={cn(
                'group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none',
                className,
            )}
            style={style}
        >
            <div
                className={cn(
                    'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90',
                    TONE[tone],
                )}
                aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {label}
                    </p>
                    <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                        {value}
                    </p>
                    {hint ? (
                        <p className="text-xs text-muted-foreground">{hint}</p>
                    ) : null}
                </div>
                {Icon ? (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-brand-700 shadow-sm dark:text-brand-200">
                        <Icon className="size-4" aria-hidden />
                    </span>
                ) : null}
            </div>
        </div>
    );
}

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type InlineStat = {
    key: string;
    label: ReactNode;
    icon?: LucideIcon;
    tone?: 'default' | 'success' | 'warning' | 'muted';
};

export type InlineStatsProps = {
    items: readonly InlineStat[];
    className?: string;
};

const toneClass: Record<NonNullable<InlineStat['tone']>, string> = {
    default: 'text-muted-foreground',
    success: 'text-emerald-700 dark:text-emerald-300',
    warning: 'text-amber-700 dark:text-amber-300',
    muted: 'text-muted-foreground',
};

/**
 * Fila compacta de métricas junto al buscador (Total, Activos, etc.).
 */
export function InlineStats({ items, className }: InlineStatsProps) {
    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs',
                className,
            )}
        >
            {items.map((item) => {
                const Icon = item.icon;
                const tone = item.tone ?? 'default';

                return (
                    <span
                        key={item.key}
                        className={cn(
                            'inline-flex items-center gap-1',
                            toneClass[tone],
                        )}
                    >
                        {Icon ? (
                            <Icon className="size-3.5" aria-hidden />
                        ) : null}
                        {item.label}
                    </span>
                );
            })}
        </div>
    );
}

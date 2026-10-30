import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PillFilterItem<TValue extends string> = {
    value: TValue;
    label: string;
    count?: number;
    muted?: boolean;
    /** Acciones al lado del pill (menú ⋯, etc.). */
    trailing?: ReactNode;
};

export type PillFiltersProps<TValue extends string> = {
    items: readonly PillFilterItem<TValue>[];
    value: TValue;
    onChange: (value: TValue) => void;
    /** Si true, volver a pulsar el activo dispara `onChange(clearValue)`. */
    toggleOff?: boolean;
    clearValue?: TValue;
    className?: string;
    'aria-label'?: string;
};

/**
 * Chips redondos con conteo (zonas, categorías, etc.).
 */
export function PillFilters<TValue extends string>({
    items,
    value,
    onChange,
    toggleOff = false,
    clearValue,
    className,
    'aria-label': ariaLabel,
}: PillFiltersProps<TValue>) {
    return (
        <div
            role="group"
            aria-label={ariaLabel}
            className={cn('flex flex-wrap gap-2', className)}
        >
            {items.map((item) => {
                const selected = value === item.value;

                return (
                    <div
                        key={item.value}
                        className="inline-flex items-center gap-0.5"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                if (
                                    toggleOff &&
                                    selected &&
                                    clearValue !== undefined
                                ) {
                                    onChange(clearValue);
                                    return;
                                }
                                onChange(item.value);
                            }}
                            className={cn(
                                'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                                selected
                                    ? 'border-brand-600 bg-brand-600 text-white'
                                    : 'border-border/70 bg-background text-foreground hover:bg-muted/50',
                                item.muted && !selected && 'opacity-60',
                            )}
                        >
                            {item.label}
                            {typeof item.count === 'number' ? (
                                <span className="tabular-nums opacity-80">
                                    {item.count}
                                </span>
                            ) : null}
                        </button>
                        {item.trailing}
                    </div>
                );
            })}
        </div>
    );
}

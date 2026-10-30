import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
    accentForEntityId,
    ENTITY_ACCENT_NEUTRAL,
    type EntityAccent,
} from './entity-accent';

export type PillFilterItem<TValue extends string> = {
    value: TValue;
    label: string;
    count?: number;
    muted?: boolean;
    /** Si false, no aplica acento de color (p. ej. “Todos”). */
    colored?: boolean;
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
    /** Colorea cada pill con un acento estable por value. */
    colored?: boolean;
};

/**
 * Chips con conteo (zonas, categorías…). Truncan label, touch ≥36–44px.
 */
export function PillFilters<TValue extends string>({
    items,
    value,
    onChange,
    toggleOff = false,
    clearValue,
    className,
    'aria-label': ariaLabel,
    colored = false,
}: PillFiltersProps<TValue>) {
    return (
        <div
            role="group"
            aria-label={ariaLabel}
            className={cn('flex flex-wrap gap-2', className)}
        >
            {items.map((item) => {
                const selected = value === item.value;
                const useColor = colored && item.colored !== false;
                const accent: EntityAccent = useColor
                    ? accentForEntityId(String(item.value))
                    : ENTITY_ACCENT_NEUTRAL;

                return (
                    <div
                        key={item.value}
                        className="inline-flex max-w-full items-center gap-0.5"
                    >
                        <button
                            type="button"
                            aria-pressed={selected}
                            title={item.label}
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
                                'inline-flex h-10 max-w-[14rem] cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors sm:h-9',
                                'focus-visible:ring-2 focus-visible:ring-[#660033]/30 focus-visible:outline-none',
                                selected ? accent.selected : accent.idle,
                                item.muted && !selected && 'opacity-55',
                            )}
                        >
                            {useColor ? (
                                <span
                                    className={cn(
                                        'size-2 shrink-0 rounded-full',
                                        selected
                                            ? 'bg-white/90'
                                            : accent.dot,
                                    )}
                                    aria-hidden
                                />
                            ) : null}
                            <span className="min-w-0 truncate whitespace-nowrap">
                                {item.label}
                            </span>
                            {typeof item.count === 'number' ? (
                                <span
                                    className={cn(
                                        'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none',
                                        selected
                                            ? 'bg-white/20 text-white'
                                            : 'bg-black/5 text-foreground/70',
                                    )}
                                >
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

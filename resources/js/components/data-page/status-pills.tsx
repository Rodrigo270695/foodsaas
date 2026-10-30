import { cn } from '@/lib/utils';

export type StatusPillOption<TValue extends string> = {
    value: TValue;
    label: string;
};

export type StatusPillsProps<TValue extends string> = {
    options: readonly StatusPillOption<TValue>[];
    value: TValue;
    onChange: (value: TValue) => void;
    className?: string;
    'aria-label'?: string;
};

/**
 * Filtro compacto de estado (Todas / Activas / Inactivas).
 */
export function StatusPills<TValue extends string>({
    options,
    value,
    onChange,
    className,
    'aria-label': ariaLabel,
}: StatusPillsProps<TValue>) {
    return (
        <div
            role="group"
            aria-label={ariaLabel}
            className={cn('flex flex-wrap gap-2', className)}
        >
            {options.map((option) => {
                const selected = value === option.value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'h-8 cursor-pointer rounded-lg border px-2.5 text-xs font-medium transition-colors',
                            selected
                                ? 'border-brand-600/40 bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200'
                                : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted',
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

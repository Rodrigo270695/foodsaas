import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function soloDigitosDocumento(value: string, max?: number): string {
    const digits = value.replace(/\D/g, '');

    return max !== undefined ? digits.slice(0, max) : digits;
}

export type DocumentNumberLookupFieldProps = {
    id: string;
    value: string;
    onChange: (next: string) => void;
    /** Longitud esperada para DNI/RUC/CE; si undefined, no muestra contador ni botón. */
    maxLength?: number;
    consulting?: boolean;
    disabled?: boolean;
    invalid?: boolean;
    onConsult?: () => void;
    consultAriaLabel: string;
    className?: string;
};

/**
 * Número de documento con contador `n/max` y botón de consulta (RENIEC/SUNAT)
 * integrado dentro del campo.
 */
export function DocumentNumberLookupField({
    id,
    value,
    onChange,
    maxLength,
    consulting = false,
    disabled = false,
    invalid = false,
    onConsult,
    consultAriaLabel,
    className,
}: DocumentNumberLookupFieldProps) {
    const isConsultable = maxLength !== undefined;
    const showConsult = isConsultable && Boolean(onConsult);
    const len = soloDigitosDocumento(value).length;
    const completo = isConsultable && len === maxLength;

    return (
        <div className={cn('relative min-w-0 w-full', className)}>
            <Input
                id={id}
                className={cn(
                    'tabular-nums tracking-wide',
                    showConsult ? 'pr-[4.75rem]' : isConsultable ? 'pr-14' : undefined,
                )}
                inputMode={isConsultable ? 'numeric' : undefined}
                autoComplete="off"
                maxLength={maxLength}
                value={value}
                disabled={disabled}
                aria-invalid={invalid}
                onChange={(e) =>
                    onChange(
                        isConsultable
                            ? soloDigitosDocumento(e.target.value, maxLength)
                            : e.target.value,
                    )
                }
            />
            {isConsultable ? (
                <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center gap-1">
                    <span
                        className={cn(
                            'text-xs font-medium tabular-nums',
                            completo
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground',
                        )}
                        aria-hidden
                    >
                        {len}/{maxLength}
                    </span>
                    {showConsult ? (
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={disabled || consulting || !completo}
                            onClick={() => onConsult?.()}
                            className={cn(
                                'pointer-events-auto size-7 shrink-0 cursor-pointer rounded-md border-0 shadow-sm transition-all',
                                'bg-gradient-to-br from-teal-500 to-emerald-600 text-white',
                                'hover:from-teal-600 hover:to-emerald-700 hover:shadow-md',
                                'focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                                'disabled:cursor-not-allowed disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:opacity-60 disabled:shadow-none',
                            )}
                            aria-label={consultAriaLabel}
                            title={consultAriaLabel}
                        >
                            {consulting ? (
                                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : (
                                <Search className="size-3.5" aria-hidden />
                            )}
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

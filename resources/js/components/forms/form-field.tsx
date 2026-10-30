import { AlertCircle, CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type FormFieldProps = {
    /** ID del input al que se asocia el label (htmlFor). */
    id: string;
    label: string;
    /** Clases extra para el `<Label>` (p. ej. tamaño compacto en tablas). */
    labelClassName?: string;
    /** Mensaje de error a mostrar; activa estado visual de error. */
    error?: string;
    /** Texto auxiliar mostrado debajo del input. */
    hint?: string;
    /**
     * Ayuda corta junto al label (icono). Preferible a `hint` largo:
     * click abre un popover sin saturar el formulario.
     */
    info?: ReactNode;
    /** Etiqueta accesible del botón de info. */
    infoLabel?: string;
    required?: boolean;
    /** El input/select/textarea. */
    children: ReactNode;
    className?: string;
};

/**
 * Wrapper de campo de formulario: label + control + error/hint/info.
 */
export function FormField({
    id,
    label,
    labelClassName,
    error,
    hint,
    info,
    infoLabel = 'Más información',
    required,
    children,
    className,
}: FormFieldProps) {
    const hasError = Boolean(error);

    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <div className="flex items-center gap-1">
                <Label
                    htmlFor={id}
                    className={cn(
                        'text-sm font-medium',
                        labelClassName,
                        hasError && 'text-destructive',
                    )}
                >
                    {label}
                    {required && (
                        <span
                            aria-hidden="true"
                            className="ml-0.5 text-destructive"
                        >
                            *
                        </span>
                    )}
                </Label>

                {info ? (
                    <Popover modal>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                aria-label={infoLabel}
                                className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                            >
                                <CircleHelp
                                    className="size-3.5"
                                    strokeWidth={2.25}
                                    aria-hidden
                                />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent
                            side="top"
                            align="start"
                            sideOffset={6}
                            className="max-w-64 text-sm leading-relaxed text-muted-foreground"
                        >
                            {info}
                        </PopoverContent>
                    </Popover>
                ) : null}
            </div>

            {children}

            {hasError ? (
                <p
                    role="alert"
                    className="flex items-start gap-1 text-xs text-destructive"
                >
                    <AlertCircle
                        className="mt-0.5 size-3 shrink-0"
                        strokeWidth={2.5}
                    />
                    <span>{error}</span>
                </p>
            ) : hint ? (
                <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    );
}

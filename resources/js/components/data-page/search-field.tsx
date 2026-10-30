import { Loader2, Search, X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type SearchFieldProps = {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    /** Spinner en el ícono mientras carga (debounce / request). */
    isSearching?: boolean;
    clearLabel?: string;
    className?: string;
    inputClassName?: string;
    id?: string;
    'aria-label'?: string;
} & Omit<
    ComponentProps<'input'>,
    'value' | 'onChange' | 'type' | 'className' | 'placeholder' | 'id'
>;

/**
 * Campo de búsqueda reutilizable: ícono Search, clear y estado loading.
 */
export function SearchField({
    value,
    onValueChange,
    placeholder = 'Buscar...',
    isSearching = false,
    clearLabel = 'Limpiar búsqueda',
    className,
    inputClassName,
    id,
    'aria-label': ariaLabel,
    ...inputProps
}: SearchFieldProps) {
    return (
        <div className={cn('relative w-full min-w-[12rem]', className)}>
            {isSearching ? (
                <Loader2
                    className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 animate-spin text-primary"
                    aria-hidden="true"
                    strokeWidth={2.25}
                />
            ) : (
                <Search
                    className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground/90"
                    aria-hidden="true"
                    strokeWidth={2.25}
                />
            )}
            <Input
                {...inputProps}
                id={id}
                type="search"
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                placeholder={placeholder}
                aria-label={ariaLabel ?? placeholder}
                className={cn(
                    'h-9 pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden',
                    inputClassName,
                )}
            />
            {value.length > 0 ? (
                <button
                    type="button"
                    onClick={() => onValueChange('')}
                    aria-label={clearLabel}
                    className="absolute top-1/2 right-2.5 z-10 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <X className="size-3.5" strokeWidth={2.5} />
                </button>
            ) : null}
        </div>
    );
}

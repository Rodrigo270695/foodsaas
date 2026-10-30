import type { ReactNode } from 'react';
import { SearchField } from '@/components/data-page/search-field';
import { cn } from '@/lib/utils';

export type DataToolbarProps = {
    /** Valor controlado del input de búsqueda. */
    search: string;
    onSearchChange: (value: string) => void;
    placeholder?: string;
    /** Si true, muestra spinner en el ícono mientras llega la respuesta. */
    isSearching?: boolean;
    /** Slot para chips/selects de filtros adicionales. */
    children?: ReactNode;
    className?: string;
    /** Clases del envoltorio del input de búsqueda (p. ej. `sm:max-w-none` para ancho completo). */
    searchWrapperClassName?: string;
    /** Clases extra del contenedor del slot `children` (p. ej. `sm:justify-end`). */
    filtersClassName?: string;
};

/**
 * Toolbar superior de una página de listado.
 * Combina SearchField + slot opcional para filtros extra.
 */
export function DataToolbar({
    search,
    onSearchChange,
    placeholder = 'Buscar...',
    isSearching = false,
    children,
    className,
    searchWrapperClassName,
    filtersClassName,
}: DataToolbarProps) {
    return (
        <div className={cn('flex w-full flex-col gap-3', className)}>
            <SearchField
                value={search}
                onValueChange={onSearchChange}
                placeholder={placeholder}
                isSearching={isSearching}
                className={cn('sm:max-w-sm', searchWrapperClassName)}
                inputClassName="h-10"
            />

            {children ? (
                <div
                    className={cn(
                        'flex min-w-0 w-full flex-wrap items-center gap-2 sm:gap-3',
                        filtersClassName,
                    )}
                >
                    {children}
                </div>
            ) : null}
        </div>
    );
}

import { CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type InfoHintProps = {
    /** Contenido del popover (texto o nodos). */
    children: ReactNode;
    /** Etiqueta accesible del botón (?). */
    label?: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    className?: string;
    /** Clases del panel. */
    contentClassName?: string;
};

/**
 * Botón (?) reutilizable: abre un popover con ayuda contextual.
 * Usar junto a labels, toolbars o acciones cuando hace falta info extra
 * sin saturar la UI.
 */
export function InfoHint({
    children,
    label = 'Más información',
    side = 'top',
    align = 'start',
    className,
    contentClassName,
}: InfoHintProps) {
    return (
        <Popover modal>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    className={cn(
                        'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors',
                        'hover:bg-muted hover:text-foreground',
                        'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
                        className,
                    )}
                >
                    <CircleHelp
                        className="size-3.5"
                        strokeWidth={2.25}
                        aria-hidden
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent
                side={side}
                align={align}
                sideOffset={6}
                className={cn(
                    'max-w-64 text-sm leading-relaxed text-muted-foreground',
                    contentClassName,
                )}
            >
                {children}
            </PopoverContent>
        </Popover>
    );
}

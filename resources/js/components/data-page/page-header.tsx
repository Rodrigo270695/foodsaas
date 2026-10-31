import type { ReactNode } from 'react';
import { StatBadge, type StatBadgeProps } from './stat-badge';
import { cn } from '@/lib/utils';

export type PageHeaderStat = Omit<StatBadgeProps, 'className'> & {
    /** Oculta el badge en móvil para no saturar la cabecera. */
    hideOnMobile?: boolean;
};

export type PageHeaderProps = {
    title: string;
    description?: ReactNode;
    stats?: PageHeaderStat[];
    /** Slot a la derecha del header: botones, dropdowns, etc. */
    action?: ReactNode;
    className?: string;
};

/**
 * Cabecera de página estándar para listados / CRUDs.
 *
 * - Sticky al hacer scroll (dentro del área de contenido del layout).
 * - Título + acciones en la misma fila (móvil y desktop) para evitar hueco vacío.
 * - Descripción oculta en móvil (`sm+`).
 */
export function PageHeader({
    title,
    description,
    stats = [],
    action,
    className,
}: PageHeaderProps) {
    return (
        <header
            className={cn(
                'sticky top-0 z-20 border-b border-border/60 bg-background/95 pt-1 pb-4 backdrop-blur-md supports-backdrop-filter:bg-background/85',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3 sm:gap-6">
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-brand-600 sm:text-3xl">
                        {title}
                    </h1>

                    {description ? (
                        <p className="mt-2 hidden text-sm leading-relaxed text-muted-foreground sm:block">
                            {description}
                        </p>
                    ) : null}
                </div>

                {action ? (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-0.5">
                        {action}
                    </div>
                ) : null}
            </div>

            {stats.length > 0 ? (
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {stats.map(({ hideOnMobile, ...stat }) => (
                        <StatBadge
                            key={stat.label}
                            {...stat}
                            className={
                                hideOnMobile ? 'hidden sm:inline-flex' : undefined
                            }
                        />
                    ))}
                </div>
            ) : null}
        </header>
    );
}

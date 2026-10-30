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
 * - Descripción oculta en móvil (`sm+`); título y acciones siempre visibles.
 * - Desktop: título + descripción a la izquierda, acción a la derecha.
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        {title}
                    </h1>

                    {description ? (
                        <p className="hidden text-sm leading-relaxed text-muted-foreground sm:block">
                            {description}
                        </p>
                    ) : null}
                </div>

                {action ? (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:self-start">
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

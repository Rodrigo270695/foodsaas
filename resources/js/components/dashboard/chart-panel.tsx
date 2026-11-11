import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ChartPanelProps = {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
    empty?: boolean;
    emptyLabel?: string;
};

export function ChartPanel({
    title,
    description,
    action,
    children,
    className,
    bodyClassName,
    empty = false,
    emptyLabel,
}: ChartPanelProps) {
    return (
        <section
            className={cn(
                'flex flex-col rounded-xl border border-border/70 bg-card shadow-sm',
                className,
            )}
        >
            <header className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold tracking-tight text-foreground">
                        {title}
                    </h2>
                    {description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </header>
            <div className={cn('min-h-[220px] flex-1 p-3 sm:p-4', bodyClassName)}>
                {empty ? (
                    <div className="flex h-full min-h-[180px] items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                        {emptyLabel}
                    </div>
                ) : (
                    children
                )}
            </div>
        </section>
    );
}

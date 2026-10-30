import { MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { MesaSalon } from '../types';

type MesaFloorCardProps = {
    mesa: MesaSalon;
    canUpdate: boolean;
    canDelete: boolean;
    onEdit: (mesa: MesaSalon) => void;
    onDelete: (mesa: MesaSalon) => void;
};

function Chair({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'block size-2.5 rounded-[3px] border-2 border-current opacity-80 sm:size-3',
                className,
            )}
        />
    );
}

export function MesaFloorCard({
    mesa,
    canUpdate,
    canDelete,
    onEdit,
    onDelete,
}: MesaFloorCardProps) {
    const { t } = useTranslation(['salon', 'common']);
    const available = mesa.activa;
    const showActions = canUpdate || canDelete;
    const displayName = mesa.nombre?.trim() || mesa.codigo;

    return (
        <article
            className={cn(
                'group relative flex flex-col overflow-hidden rounded-2xl border bg-card/80 p-3 shadow-sm transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-ring/40',
                available
                    ? 'border-emerald-500/35 hover:border-emerald-500/55'
                    : 'border-border/70 opacity-90 hover:border-border',
            )}
        >
            <div className="mb-2 flex items-start justify-between gap-2">
                <span
                    className={cn(
                        'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase',
                        available
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground',
                    )}
                >
                    {available ? t('floor.available') : t('floor.inactive')}
                </span>
                {showActions ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t('row.actions_for_mesa', {
                                    code: mesa.codigo,
                                })}
                                className="size-8 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                                <MoreHorizontal className="size-4" strokeWidth={2.5} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {canUpdate ? (
                                <DropdownMenuItem
                                    onSelect={() => onEdit(mesa)}
                                    className="cursor-pointer gap-2"
                                >
                                    <Pencil className="size-4" strokeWidth={2.25} />
                                    {t('common:actions.edit')}
                                </DropdownMenuItem>
                            ) : null}
                            {canDelete ? (
                                <DropdownMenuItem
                                    onSelect={() => onDelete(mesa)}
                                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="size-4" strokeWidth={2.25} />
                                    {t('common:actions.delete')}
                                </DropdownMenuItem>
                            ) : null}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : null}
            </div>

            <button
                type="button"
                disabled={!canUpdate}
                onClick={() => {
                    if (canUpdate) {
                        onEdit(mesa);
                    }
                }}
                className={cn(
                    'flex flex-1 flex-col items-center gap-3 rounded-xl px-2 py-3 text-center outline-none',
                    canUpdate ? 'cursor-pointer' : 'cursor-default',
                    available
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-muted-foreground',
                )}
            >
                <div className="relative grid place-items-center">
                    <div className="absolute -top-1 flex gap-1.5">
                        {Array.from({ length: Math.min(mesa.capacidad, 4) }).map(
                            (_, i) => (
                                <Chair key={`t-${i}`} />
                            ),
                        )}
                    </div>
                    <div
                        className={cn(
                            'mt-3 flex size-16 items-center justify-center rounded-xl border-2 sm:size-[4.5rem]',
                            available
                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                : 'border-border bg-muted/40',
                        )}
                    >
                        <span className="font-mono text-lg font-bold tracking-tight text-foreground sm:text-xl">
                            {mesa.codigo}
                        </span>
                    </div>
                    <div className="absolute -bottom-1 flex gap-1.5">
                        {Array.from({
                            length: Math.min(Math.max(mesa.capacidad - 2, 0), 4),
                        }).map((_, i) => (
                            <Chair key={`b-${i}`} />
                        ))}
                    </div>
                </div>

                <div className="mt-1 w-full space-y-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                        {displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {mesa.zona?.nombre ?? '—'}
                    </p>
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3.5" strokeWidth={2.25} aria-hidden />
                        <span className="tabular-nums">
                            {t('floor.capacity', { count: mesa.capacidad })}
                        </span>
                    </p>
                </div>
            </button>
        </article>
    );
}

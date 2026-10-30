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

/** Tope visual: más de esto satura la card; el texto sigue mostrando la capacidad real. */
const MAX_VISIBLE_CHAIRS = 10;

function Chair({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'block size-2.5 rounded-[3px] border-[1.5px] border-current bg-current/10 sm:size-3',
                className,
            )}
        />
    );
}

type TableDiagramProps = {
    codigo: string;
    capacidad: number;
    available: boolean;
};

/**
 * Diagrama de piso: mesa cuadrada con bordes redondos (misma forma siempre)
 * y exactamente `capacidad` sillas (tope visual 10) alrededor.
 */
function TableDiagram({ codigo, capacidad, available }: TableDiagramProps) {
    const seats = Math.max(1, Math.min(capacidad, MAX_VISIBLE_CHAIRS));
    const overflow = Math.max(0, capacidad - MAX_VISIBLE_CHAIRS);
    const radius = 38;

    return (
        <div
            className="relative mx-auto size-[5.5rem] sm:size-[6.5rem]"
            aria-hidden="true"
        >
            <div
                className={cn(
                    'absolute top-1/2 left-1/2 flex size-[3.25rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 shadow-sm sm:size-[3.75rem]',
                    available
                        ? 'border-emerald-500/55 bg-emerald-500/12'
                        : 'border-border bg-muted/50',
                )}
            >
                <span className="font-mono text-sm font-bold tracking-tight text-foreground sm:text-base">
                    {codigo}
                </span>
            </div>

            {Array.from({ length: seats }).map((_, i) => {
                const angleDeg = (360 / seats) * i - 90;
                const angleRad = (angleDeg * Math.PI) / 180;
                const x = Math.cos(angleRad) * radius;
                const y = Math.sin(angleRad) * radius;
                const faceCenter = angleDeg + 90;

                return (
                    <span
                        key={i}
                        className="absolute top-1/2 left-1/2"
                        style={{
                            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${faceCenter}deg)`,
                        }}
                    >
                        <Chair
                            className={cn(
                                available
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-muted-foreground',
                            )}
                        />
                    </span>
                );
            })}

            {overflow > 0 ? (
                <span
                    className={cn(
                        'absolute -right-0.5 -bottom-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums',
                        available
                            ? 'bg-emerald-600 text-white'
                            : 'bg-muted-foreground text-background',
                    )}
                >
                    +{overflow}
                </span>
            ) : null}
        </div>
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
            <div className="mb-1 flex items-start justify-between gap-2">
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
                                <MoreHorizontal
                                    className="size-4"
                                    strokeWidth={2.5}
                                />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {canUpdate ? (
                                <DropdownMenuItem
                                    onSelect={() => onEdit(mesa)}
                                    className="cursor-pointer gap-2"
                                >
                                    <Pencil
                                        className="size-4"
                                        strokeWidth={2.25}
                                    />
                                    {t('common:actions.edit')}
                                </DropdownMenuItem>
                            ) : null}
                            {canDelete ? (
                                <DropdownMenuItem
                                    onSelect={() => onDelete(mesa)}
                                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                >
                                    <Trash2
                                        className="size-4"
                                        strokeWidth={2.25}
                                    />
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
                    'flex flex-1 flex-col items-center gap-2.5 rounded-xl px-1 py-2 text-center outline-none',
                    canUpdate ? 'cursor-pointer' : 'cursor-default',
                )}
            >
                <TableDiagram
                    codigo={mesa.codigo}
                    capacidad={mesa.capacidad}
                    available={available}
                />

                <div className="w-full space-y-0.5">
                    <p className="truncate text-sm font-semibold text-foreground">
                        {displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {mesa.zona?.nombre ?? '—'}
                    </p>
                    <p className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Users
                            className="size-3.5"
                            strokeWidth={2.25}
                            aria-hidden
                        />
                        <span className="tabular-nums">
                            {t('floor.capacity', { count: mesa.capacidad })}
                        </span>
                    </p>
                </div>
            </button>
        </article>
    );
}

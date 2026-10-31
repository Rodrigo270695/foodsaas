import {
    ClipboardList,
    Link2,
    MoreHorizontal,
    Pencil,
    Trash2,
    Unlink2,
    Users,
} from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/use-permission';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { openOrCreateMesaPedido } from '../lib/open-mesa-pedido';
import type { MesaSalon, SalonFloorMode } from '../types';

type MesaFloorCardProps = {
    mesa: MesaSalon;
    mode: SalonFloorMode;
    canUpdate: boolean;
    canDelete: boolean;
    joinedCapacidad?: number;
    onEdit: (mesa: MesaSalon) => void;
    onDelete: (mesa: MesaSalon) => void;
    onSeparar?: () => void;
    /** Si está definido, el click principal activa unión (tap) en vez de editar. */
    onJoinTap?: () => void;
    joinHighlight?: 'source' | 'target' | null;
    onJoinDragStart?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
};

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

function TableDiagram({
    codigo,
    capacidad,
    available,
    occupied,
    joined,
}: {
    codigo: string;
    capacidad: number;
    available: boolean;
    occupied?: boolean;
    joined?: boolean;
}) {
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
                    joined
                        ? 'border-[#660033]/70 bg-[#660033]/10'
                        : occupied
                          ? 'border-amber-500/60 bg-amber-500/15'
                          : available
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
                                joined
                                    ? 'text-[#660033]'
                                    : available
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
    mode,
    canUpdate,
    canDelete,
    joinedCapacidad,
    onEdit,
    onDelete,
    onSeparar,
    onJoinTap,
    joinHighlight = null,
    onJoinDragStart,
}: MesaFloorCardProps) {
    const { t } = useTranslation(['salon', 'common']);
    const { can } = usePermission();
    const isGestionar = mode === 'gestionar';
    const pedidoActivo = mesa.pedidos?.[0] ?? null;
    const occupied = Boolean(pedidoActivo);
    const available = mesa.activa && !occupied;
    const joined = Boolean(mesa.union_id);
    const showManageChrome = isGestionar && (canUpdate || canDelete);
    const displayName = mesa.nombre?.trim() || mesa.codigo;
    const primaryEnabled = isGestionar
        ? Boolean(canUpdate || onJoinTap)
        : Boolean(
              onJoinTap ||
                  (available && can('pedidos.create')) ||
                  (occupied && can('pedidos.view')),
          );

    return (
        <article
            data-mesa-id={mesa.id}
            className={cn(
                'group relative flex flex-col overflow-hidden rounded-2xl border bg-card/80 p-3 shadow-sm transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-ring/40',
                joinHighlight === 'source' &&
                    'ring-2 ring-[#660033] border-[#660033]/60',
                joinHighlight === 'target' &&
                    'ring-2 ring-emerald-500 border-emerald-500/60 scale-[1.02]',
                !joinHighlight &&
                    (joined
                        ? 'border-[#660033]/45 hover:border-[#660033]/70'
                        : occupied
                          ? 'border-amber-500/45 hover:border-amber-500/65'
                          : available
                            ? 'border-emerald-500/35 hover:border-emerald-500/55'
                            : 'border-border/70 opacity-90 hover:border-border'),
            )}
        >
            <div className="mb-1 flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                    <span
                        className={cn(
                            'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase',
                            occupied
                                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                                : available
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-muted text-muted-foreground',
                        )}
                    >
                        {occupied
                            ? t('floor.occupied', {
                                  defaultValue: 'Ocupada',
                              })
                            : available
                              ? t('floor.available')
                              : t('floor.inactive')}
                    </span>
                    {occupied && pedidoActivo ? (
                        <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-200">
                            #{pedidoActivo.numero}
                        </span>
                    ) : null}
                    {joined ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#660033]/12 px-2 py-0.5 text-[10px] font-semibold text-[#660033]">
                            <Link2 className="size-3" />
                            {t('union.badge', { defaultValue: 'Unida' })}
                            {joinedCapacidad
                                ? ` · ${joinedCapacidad}`
                                : null}
                        </span>
                    ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                    {showManageChrome && canUpdate && joined && onSeparar ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 cursor-pointer text-[#660033] hover:bg-[#660033]/10"
                                    aria-label={t('union.separar')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSeparar();
                                    }}
                                >
                                    <Unlink2 className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {t('union.separar')}
                            </TooltipContent>
                        </Tooltip>
                    ) : null}
                    {showManageChrome &&
                    canUpdate &&
                    available &&
                    onJoinDragStart ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 cursor-grab touch-none text-[#660033] hover:bg-[#660033]/10 active:cursor-grabbing"
                                    aria-label={t('union.drag')}
                                    onPointerDown={onJoinDragStart}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Link2 className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {t('union.drag')}
                            </TooltipContent>
                        </Tooltip>
                    ) : null}
                    {showManageChrome ? (
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
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal
                                        className="size-4"
                                        strokeWidth={2.5}
                                    />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
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
                                {canUpdate && onSeparar ? (
                                    <DropdownMenuItem
                                        onSelect={onSeparar}
                                        className="cursor-pointer gap-2"
                                    >
                                        <Unlink2 className="size-4" />
                                        {t('union.separar', {
                                            defaultValue: 'Separar mesa',
                                        })}
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
            </div>

            <button
                type="button"
                disabled={!primaryEnabled}
                aria-label={
                    isGestionar
                        ? t('row.actions_for_mesa', { code: mesa.codigo })
                        : occupied
                          ? t('floor.open_order', {
                                defaultValue: 'Abrir pedido',
                            })
                          : t('floor.new_order', {
                                defaultValue: 'Tomar pedido',
                            })
                }
                onClick={() => {
                    if (onJoinTap) {
                        onJoinTap();
                        return;
                    }
                    if (!isGestionar) {
                        if (
                            (available && can('pedidos.create')) ||
                            (occupied && can('pedidos.view'))
                        ) {
                            openOrCreateMesaPedido(mesa);
                        }
                        return;
                    }
                    if (canUpdate) {
                        onEdit(mesa);
                    }
                }}
                className={cn(
                    'flex flex-1 flex-col items-center gap-2.5 rounded-xl px-1 py-2 text-center outline-none touch-manipulation',
                    primaryEnabled ? 'cursor-pointer' : 'cursor-default',
                )}
            >
                <TableDiagram
                    codigo={mesa.codigo}
                    capacidad={mesa.capacidad}
                    available={available}
                    occupied={occupied}
                    joined={joined}
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
                            {joined && joinedCapacidad
                                ? t('union.capacity_group', {
                                      solo: mesa.capacidad,
                                      total: joinedCapacidad,
                                  })
                                : t('floor.capacity', {
                                      count: mesa.capacidad,
                                  })}
                        </span>
                    </p>
                    {!isGestionar && mesa.activa ? (
                        <p className="inline-flex items-center justify-center gap-1 pt-0.5 text-[11px] font-medium text-[#660033]">
                            <ClipboardList
                                className="size-3"
                                strokeWidth={2.25}
                                aria-hidden
                            />
                            {occupied
                                ? t('floor.open_order', {
                                      defaultValue: 'Abrir pedido',
                                  })
                                : t('floor.new_order', {
                                      defaultValue: 'Tomar pedido',
                                  })}
                        </p>
                    ) : null}
                </div>
            </button>
        </article>
    );
}

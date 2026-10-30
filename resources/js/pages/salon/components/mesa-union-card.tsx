import {
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { MesaSalon } from '../types';

type MesaUnionCardProps = {
    mesas: MesaSalon[];
    capacidadTotal: number;
    canUpdate: boolean;
    canDelete: boolean;
    onEdit: (mesa: MesaSalon) => void;
    onDelete: (mesa: MesaSalon) => void;
    onDissolve: () => void;
    onSepararOne: (mesa: MesaSalon) => void;
    onJoinTap?: () => void;
    joinHighlight?: 'source' | 'target' | null;
    onJoinDragStart?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
};

const MAX_VISIBLE_CHAIRS = 12;

function Chair({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'block size-2 rounded-[3px] border-[1.5px] border-current bg-current/10 sm:size-2.5',
                className,
            )}
        />
    );
}

/**
 * Tablero alargado: crece en ancho según N miembros; códigos dentro.
 */
function UnionTableDiagram({
    codigos,
    capacidad,
}: {
    codigos: string[];
    capacidad: number;
}) {
    const n = Math.max(2, codigos.length);
    const seats = Math.max(1, Math.min(capacidad, MAX_VISIBLE_CHAIRS));
    const overflow = Math.max(0, capacidad - MAX_VISIBLE_CHAIRS);
    const boardW = Math.min(11, 4.25 + n * 1.35);
    const boardH = 2.85;
    const padX = 14;

    const topCount = Math.ceil(seats / 2);
    const bottomCount = seats - topCount;

    return (
        <div
            className="relative mx-auto"
            style={{
                width: `min(100%, ${boardW + 1.6}rem)`,
                height: `${boardH + 2.2}rem`,
            }}
            aria-hidden="true"
        >
            {/* Sillas arriba */}
            {Array.from({ length: topCount }).map((_, i) => {
                const t = topCount === 1 ? 0.5 : i / (topCount - 1);
                return (
                    <span
                        key={`t-${i}`}
                        className="absolute text-[#660033]"
                        style={{
                            left: `calc(${padX}% + ${t * (100 - padX * 2)}%)`,
                            top: '2px',
                            transform: 'translateX(-50%)',
                        }}
                    >
                        <Chair className="text-[#660033]" />
                    </span>
                );
            })}

            {/* Tablero */}
            <div
                className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 rounded-2xl border-2 border-[#660033]/70 bg-[#660033]/10 px-2 shadow-sm sm:gap-1.5 sm:px-3"
                style={{
                    width: `${boardW}rem`,
                    height: `${boardH}rem`,
                }}
            >
                {codigos.map((code, i) => (
                    <span key={code} className="flex items-center gap-1">
                        {i > 0 ? (
                            <span className="text-[10px] font-bold text-[#660033]/45">
                                ·
                            </span>
                        ) : null}
                        <span className="font-mono text-xs font-bold tracking-tight text-foreground sm:text-sm">
                            {code}
                        </span>
                    </span>
                ))}
            </div>

            {/* Sillas abajo */}
            {Array.from({ length: bottomCount }).map((_, i) => {
                const t = bottomCount === 1 ? 0.5 : i / (bottomCount - 1);
                return (
                    <span
                        key={`b-${i}`}
                        className="absolute text-[#660033]"
                        style={{
                            left: `calc(${padX}% + ${t * (100 - padX * 2)}%)`,
                            bottom: '2px',
                            transform: 'translateX(-50%)',
                        }}
                    >
                        <Chair className="text-[#660033]" />
                    </span>
                );
            })}

            {overflow > 0 ? (
                <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-[#660033] px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-white">
                    +{overflow}
                </span>
            ) : null}
        </div>
    );
}

export function MesaUnionCard({
    mesas,
    capacidadTotal,
    canUpdate,
    canDelete,
    onEdit,
    onDelete,
    onDissolve,
    onSepararOne,
    onJoinTap,
    joinHighlight = null,
    onJoinDragStart,
}: MesaUnionCardProps) {
    const { t } = useTranslation(['salon', 'common']);
    const primary = mesas[0];
    if (!primary) {
        return null;
    }

    const zonaNombre = primary.zona?.nombre ?? '—';
    const codigos = mesas.map((m) => m.codigo);
    const showActions = canUpdate || canDelete;
    const allActive = mesas.every((m) => m.activa);

    return (
        <article
            className={cn(
                'group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card/80 p-3 shadow-sm transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-ring/40',
                joinHighlight === 'source' &&
                    'ring-2 ring-[#660033] border-[#660033]/60',
                joinHighlight === 'target' &&
                    'ring-2 ring-emerald-500 border-emerald-500/60 scale-[1.02]',
                !joinHighlight &&
                    'border-[#660033]/45 hover:border-[#660033]/70',
            )}
        >
            <div className="mb-1 flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                    <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                        {t('floor.available')}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#660033]/12 px-2 py-0.5 text-[10px] font-semibold text-[#660033]">
                        <Link2 className="size-3" aria-hidden />
                        {t('union.badge')}
                        {` · ${capacidadTotal}`}
                    </span>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                    {canUpdate ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 cursor-pointer text-[#660033] hover:bg-[#660033]/10"
                                    aria-label={t('union.separar_grupo')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDissolve();
                                    }}
                                >
                                    <Unlink2 className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {t('union.separar_grupo')}
                            </TooltipContent>
                        </Tooltip>
                    ) : null}

                    {canUpdate && allActive && onJoinDragStart ? (
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

                    {showActions ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('union.group_actions')}
                                    className="size-8 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal
                                        className="size-4"
                                        strokeWidth={2.5}
                                    />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                {canUpdate
                                    ? mesas.map((mesa) => (
                                          <DropdownMenuItem
                                              key={`edit-${mesa.id}`}
                                              onSelect={() => onEdit(mesa)}
                                              className="cursor-pointer gap-2"
                                          >
                                              <Pencil
                                                  className="size-4"
                                                  strokeWidth={2.25}
                                              />
                                              {t('union.edit_member', {
                                                  code: mesa.codigo,
                                              })}
                                          </DropdownMenuItem>
                                      ))
                                    : null}
                                {canUpdate ? (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={onDissolve}
                                            className="cursor-pointer gap-2"
                                        >
                                            <Unlink2 className="size-4" />
                                            {t('union.separar_grupo')}
                                        </DropdownMenuItem>
                                        {mesas.map((mesa) => (
                                            <DropdownMenuItem
                                                key={`sep-${mesa.id}`}
                                                onSelect={() =>
                                                    onSepararOne(mesa)
                                                }
                                                className="cursor-pointer gap-2"
                                            >
                                                <Unlink2 className="size-4 opacity-70" />
                                                {t('union.separar_one', {
                                                    code: mesa.codigo,
                                                })}
                                            </DropdownMenuItem>
                                        ))}
                                    </>
                                ) : null}
                                {canDelete ? (
                                    <>
                                        <DropdownMenuSeparator />
                                        {mesas.map((mesa) => (
                                            <DropdownMenuItem
                                                key={`del-${mesa.id}`}
                                                onSelect={() => onDelete(mesa)}
                                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                            >
                                                <Trash2
                                                    className="size-4"
                                                    strokeWidth={2.25}
                                                />
                                                {t('common:actions.delete')}{' '}
                                                {mesa.codigo}
                                            </DropdownMenuItem>
                                        ))}
                                    </>
                                ) : null}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : null}
                </div>
            </div>

            <div
                role={onJoinTap ? 'button' : undefined}
                tabIndex={onJoinTap ? 0 : undefined}
                onClick={() => {
                    if (onJoinTap) {
                        onJoinTap();
                    }
                }}
                onKeyDown={(e) => {
                    if (!onJoinTap) {
                        return;
                    }
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onJoinTap();
                    }
                }}
                className={cn(
                    'flex flex-1 flex-col items-center gap-2.5 rounded-xl px-1 py-2 text-center outline-none',
                    onJoinTap ? 'cursor-pointer' : 'cursor-default',
                )}
            >
                <UnionTableDiagram
                    codigos={codigos}
                    capacidad={capacidadTotal}
                />

                <div className="flex w-full flex-wrap items-center justify-center gap-1">
                    {mesas.map((mesa) => (
                        <button
                            key={mesa.id}
                            type="button"
                            disabled={!canUpdate}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (canUpdate) {
                                    onEdit(mesa);
                                }
                            }}
                            className={cn(
                                'rounded-md border border-[#660033]/25 bg-[#660033]/5 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#660033] transition-colors',
                                canUpdate &&
                                    'cursor-pointer hover:border-[#660033]/50 hover:bg-[#660033]/10',
                                !canUpdate && 'cursor-default',
                            )}
                        >
                            {mesa.codigo}
                        </button>
                    ))}
                </div>

                <div className="w-full space-y-0.5">
                    <p className="truncate text-sm font-semibold text-foreground">
                        {t('union.group_title', {
                            count: mesas.length,
                        })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {zonaNombre}
                    </p>
                    <p className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Users
                            className="size-3.5"
                            strokeWidth={2.25}
                            aria-hidden
                        />
                        <span className="tabular-nums">
                            {t('union.capacity_total', {
                                total: capacidadTotal,
                            })}
                        </span>
                    </p>
                </div>
            </div>
        </article>
    );
}

import { Unlink2 } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { toastManager } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { MesaSalon } from '../types';
import { MesaFloorCard } from './mesa-floor-card';

type MesasGridProps = {
    mesas: MesaSalon[];
    isLoading?: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    ariaLabel: string;
    joinMode: boolean;
    onJoinModeChange: (next: boolean) => void;
    onEdit: (mesa: MesaSalon) => void;
    onDelete: (mesa: MesaSalon) => void;
    onUnir: (mesaIds: [string, string]) => void;
    onSeparar: (mesa: MesaSalon) => void;
};

type Point = { x: number; y: number };

export function MesasGrid({
    mesas,
    isLoading = false,
    canUpdate,
    canDelete,
    ariaLabel,
    joinMode,
    onJoinModeChange,
    onEdit,
    onDelete,
    onUnir,
    onSeparar,
}: MesasGridProps) {
    const { t } = useTranslation('salon');
    const wrapRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [centers, setCenters] = useState<Map<string, Point>>(new Map());
    const [joinSourceId, setJoinSourceId] = useState<string | null>(null);
    const [dragLine, setDragLine] = useState<{
        from: Point;
        to: Point;
    } | null>(null);
    const [dragFromId, setDragFromId] = useState<string | null>(null);
    const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);

    const mesaById = useMemo(() => {
        const map = new Map<string, MesaSalon>();
        for (const mesa of mesas) {
            map.set(mesa.id, mesa);
        }
        return map;
    }, [mesas]);

    const unionCapacidad = useMemo(() => {
        const map = new Map<string, number>();
        for (const mesa of mesas) {
            if (!mesa.union_id) {
                continue;
            }
            map.set(
                mesa.union_id,
                (map.get(mesa.union_id) ?? 0) + mesa.capacidad,
            );
        }
        return map;
    }, [mesas]);

    const unionPairs = useMemo(() => {
        const byUnion = new Map<string, string[]>();
        for (const mesa of mesas) {
            if (!mesa.union_id) {
                continue;
            }
            const list = byUnion.get(mesa.union_id) ?? [];
            list.push(mesa.id);
            byUnion.set(mesa.union_id, list);
        }
        const pairs: Array<{ key: string; a: string; b: string }> = [];
        for (const [unionId, ids] of byUnion) {
            for (let i = 0; i < ids.length - 1; i += 1) {
                pairs.push({
                    key: `${unionId}-${ids[i]}-${ids[i + 1]}`,
                    a: ids[i]!,
                    b: ids[i + 1]!,
                });
            }
        }
        return pairs;
    }, [mesas]);

    const measure = useCallback(() => {
        const wrap = wrapRef.current;
        if (!wrap) {
            return;
        }
        const root = wrap.getBoundingClientRect();
        const next = new Map<string, Point>();
        cardRefs.current.forEach((el, id) => {
            const r = el.getBoundingClientRect();
            next.set(id, {
                x: r.left - root.left + r.width / 2,
                y: r.top - root.top + r.height / 2,
            });
        });
        setCenters(next);
    }, []);

    useLayoutEffect(() => {
        measure();
    }, [measure, mesas]);

    useEffect(() => {
        const onResize = () => measure();
        window.addEventListener('resize', onResize);
        const wrap = wrapRef.current;
        const ro =
            typeof ResizeObserver !== 'undefined' && wrap
                ? new ResizeObserver(onResize)
                : null;
        if (wrap) {
            ro?.observe(wrap);
        }
        return () => {
            window.removeEventListener('resize', onResize);
            ro?.disconnect();
        };
    }, [measure]);

    useEffect(() => {
        if (!joinMode) {
            setJoinSourceId(null);
        }
    }, [joinMode]);

    const resetDrag = () => {
        setDragLine(null);
        setDragFromId(null);
        setHoverTargetId(null);
    };

    const sameZona = (a: MesaSalon, b: MesaSalon) => a.zona_id === b.zona_id;

    const finishJoin = (fromId: string, toId: string) => {
        if (fromId === toId) {
            return;
        }
        const from = mesaById.get(fromId);
        const to = mesaById.get(toId);
        if (!from?.activa || !to?.activa) {
            return;
        }
        if (!sameZona(from, to)) {
            toastManager.error({ title: t('union.same_zone_error') });
            resetDrag();
            setJoinSourceId(null);
            onJoinModeChange(false);
            return;
        }
        onUnir([fromId, toId]);
        resetDrag();
        setJoinSourceId(null);
        onJoinModeChange(false);
    };

    const mesaIdAtPoint = (clientX: number, clientY: number) => {
        const el = document.elementFromPoint(clientX, clientY);
        const target = el?.closest('[data-mesa-id]') as HTMLElement | null;
        return target?.getAttribute('data-mesa-id') ?? null;
    };

    const onPointerMove = (e: ReactPointerEvent) => {
        if (!dragFromId || !wrapRef.current) {
            return;
        }
        const root = wrapRef.current.getBoundingClientRect();
        const from = centers.get(dragFromId);
        if (!from) {
            return;
        }
        setDragLine({
            from,
            to: { x: e.clientX - root.left, y: e.clientY - root.top },
        });
        const overId = mesaIdAtPoint(e.clientX, e.clientY);
        if (!overId || overId === dragFromId) {
            setHoverTargetId(null);
            return;
        }
        const fromMesa = mesaById.get(dragFromId);
        const overMesa = mesaById.get(overId);
        if (
            fromMesa &&
            overMesa &&
            overMesa.activa &&
            sameZona(fromMesa, overMesa)
        ) {
            setHoverTargetId(overId);
        } else {
            setHoverTargetId(null);
        }
    };

    const onPointerUp = (e: ReactPointerEvent) => {
        if (!dragFromId) {
            return;
        }
        const toId = mesaIdAtPoint(e.clientX, e.clientY);
        if (toId) {
            finishJoin(dragFromId, toId);
        } else {
            resetDrag();
        }
    };

    const handleJoinTap = (mesa: MesaSalon) => {
        if (!canUpdate || !mesa.activa) {
            return;
        }
        if (!joinSourceId) {
            setJoinSourceId(mesa.id);
            return;
        }
        finishJoin(joinSourceId, mesa.id);
    };

    const joinSource = joinSourceId
        ? mesaById.get(joinSourceId)
        : undefined;

    return (
        <div
            ref={wrapRef}
            className="relative"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={resetDrag}
        >
            {joinMode ? (
                <p
                    className="mb-3 rounded-lg border border-[#660033]/25 bg-[#660033]/5 px-3 py-2 text-xs text-[#660033]"
                    role="status"
                >
                    {joinSourceId
                        ? t('union.mode_pick_second')
                        : t('union.mode_on')}
                </p>
            ) : null}

            <svg
                className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
                aria-hidden
            >
                <defs>
                    <linearGradient
                        id="mesa-union-stroke"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                    >
                        <stop offset="0%" stopColor="#660033" />
                        <stop offset="50%" stopColor="#9d174d" />
                        <stop offset="100%" stopColor="#0d9488" />
                    </linearGradient>
                    <filter
                        id="mesa-union-glow"
                        x="-40%"
                        y="-40%"
                        width="180%"
                        height="180%"
                    >
                        <feGaussianBlur stdDeviation="2.8" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {unionPairs.map((pair) => {
                    const a = centers.get(pair.a);
                    const b = centers.get(pair.b);
                    if (!a || !b) {
                        return null;
                    }
                    const mx = (a.x + b.x) / 2;
                    const my = (a.y + b.y) / 2 - 18;
                    return (
                        <g key={pair.key} filter="url(#mesa-union-glow)">
                            <path
                                d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                                fill="none"
                                stroke="url(#mesa-union-stroke)"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                className="mesa-union-path"
                                strokeDasharray="10 7"
                            />
                            <circle
                                cx={a.x}
                                cy={a.y}
                                r="5.5"
                                className="fill-[#660033]"
                            />
                            <circle
                                cx={b.x}
                                cy={b.y}
                                r="5.5"
                                className="fill-teal-600"
                            />
                        </g>
                    );
                })}

                {dragLine ? (
                    <g>
                        <line
                            x1={dragLine.from.x}
                            y1={dragLine.from.y}
                            x2={dragLine.to.x}
                            y2={dragLine.to.y}
                            stroke="#660033"
                            strokeWidth="2.5"
                            strokeDasharray="7 5"
                            strokeLinecap="round"
                            className="opacity-90"
                        />
                        <circle
                            cx={dragLine.from.x}
                            cy={dragLine.from.y}
                            r="5"
                            className="fill-[#660033]"
                        />
                        <circle
                            cx={dragLine.to.x}
                            cy={dragLine.to.y}
                            r="7"
                            className="fill-[#660033]/75 stroke-white"
                            strokeWidth="2"
                        />
                    </g>
                ) : null}
            </svg>

            {/* Botones Separar sobre el centro de cada enlace */}
            {canUpdate
                ? unionPairs.map((pair) => {
                      const a = centers.get(pair.a);
                      const b = centers.get(pair.b);
                      if (!a || !b) {
                          return null;
                      }
                      const mx = (a.x + b.x) / 2;
                      const my = (a.y + b.y) / 2 - 18;
                      const mesaA = mesaById.get(pair.a);
                      if (!mesaA) {
                          return null;
                      }

                      return (
                          <Tooltip key={`cut-${pair.key}`}>
                              <TooltipTrigger asChild>
                                  <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      aria-label={t('union.separar')}
                                      className="absolute z-20 size-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-[#660033]/40 bg-background text-[#660033] shadow-md hover:bg-[#660033]/10"
                                      style={{ left: mx, top: my }}
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          onSeparar(mesaA);
                                      }}
                                  >
                                      <Unlink2 className="size-3.5" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                  {t('union.separar')}
                              </TooltipContent>
                          </Tooltip>
                      );
                  })
                : null}

            <style>{`
                @keyframes mesa-union-dash {
                    to { stroke-dashoffset: -34; }
                }
                .mesa-union-path {
                    animation: mesa-union-dash 1.4s linear infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .mesa-union-path { animation: none; }
                }
            `}</style>

            <div
                className={cn(
                    'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
                    isLoading && 'pointer-events-none opacity-60',
                    dragFromId && 'select-none',
                )}
                role="status"
                aria-live="polite"
                aria-label={ariaLabel}
            >
                {mesas.map((mesa, index) => {
                    const joinedCap = mesa.union_id
                        ? unionCapacidad.get(mesa.union_id)
                        : undefined;

                    const sameZoneAsSource =
                        !joinSource || sameZona(joinSource, mesa);

                    let joinHighlight: 'source' | 'target' | null = null;
                    if (joinSourceId === mesa.id || dragFromId === mesa.id) {
                        joinHighlight = 'source';
                    } else if (
                        hoverTargetId === mesa.id ||
                        (joinMode &&
                            joinSourceId !== null &&
                            joinSourceId !== mesa.id &&
                            mesa.activa &&
                            sameZoneAsSource)
                    ) {
                        joinHighlight = 'target';
                    }

                    return (
                        <div
                            key={mesa.id}
                            data-mesa-id={mesa.id}
                            ref={(el) => {
                                if (el) {
                                    cardRefs.current.set(mesa.id, el);
                                } else {
                                    cardRefs.current.delete(mesa.id);
                                }
                            }}
                            className="relative z-0 animate-in fade-in zoom-in-95 fill-mode-both duration-300"
                            style={{
                                animationDelay: `${Math.min(index, 12) * 40}ms`,
                            }}
                        >
                            <MesaFloorCard
                                mesa={mesa}
                                canUpdate={canUpdate}
                                canDelete={canDelete}
                                joinedCapacidad={joinedCap}
                                joinHighlight={joinHighlight}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onSeparar={
                                    mesa.union_id
                                        ? () => onSeparar(mesa)
                                        : undefined
                                }
                                onJoinTap={
                                    joinMode && canUpdate && mesa.activa
                                        ? () => handleJoinTap(mesa)
                                        : undefined
                                }
                                onJoinDragStart={
                                    canUpdate && mesa.activa
                                        ? (e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              wrapRef.current?.setPointerCapture?.(
                                                  e.pointerId,
                                              );
                                              onJoinModeChange(false);
                                              setJoinSourceId(null);
                                              setDragFromId(mesa.id);
                                              const c = centers.get(mesa.id);
                                              if (c) {
                                                  setDragLine({
                                                      from: c,
                                                      to: c,
                                                  });
                                              }
                                          }
                                        : undefined
                                }
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

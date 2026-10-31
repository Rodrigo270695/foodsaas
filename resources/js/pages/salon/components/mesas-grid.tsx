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
import { toastManager } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { MesaSalon, SalonFloorMode } from '../types';
import { MesaFloorCard } from './mesa-floor-card';
import { MesaUnionCard } from './mesa-union-card';

type MesasGridProps = {
    mesas: MesaSalon[];
    mode: SalonFloorMode;
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
    onDissolveUnion: (mesas: MesaSalon[]) => void;
};

type Point = { x: number; y: number };

type GridItem =
    | { kind: 'solo'; mesa: MesaSalon; key: string }
    | {
          kind: 'union';
          unionId: string;
          mesas: MesaSalon[];
          key: string;
          capacidad: number;
      };

export function MesasGrid({
    mesas,
    mode,
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
    onDissolveUnion,
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

    const gridItems = useMemo<GridItem[]>(() => {
        const seenUnions = new Set<string>();
        const items: GridItem[] = [];

        for (const mesa of mesas) {
            if (!mesa.union_id) {
                items.push({ kind: 'solo', mesa, key: mesa.id });
                continue;
            }
            if (seenUnions.has(mesa.union_id)) {
                continue;
            }
            seenUnions.add(mesa.union_id);
            const group = mesas.filter((m) => m.union_id === mesa.union_id);
            const capacidad = group.reduce((sum, m) => sum + m.capacidad, 0);
            items.push({
                kind: 'union',
                unionId: mesa.union_id,
                mesas: group,
                key: `union-${mesa.union_id}`,
                capacidad,
            });
        }

        return items;
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
    }, [measure, mesas, gridItems]);

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

    /** Representante estable de un grupo (o la mesa misma). */
    const joinRepId = (mesaId: string): string => {
        const mesa = mesaById.get(mesaId);
        if (!mesa?.union_id) {
            return mesaId;
        }
        const group = mesas.filter((m) => m.union_id === mesa.union_id);
        return group[0]?.id ?? mesaId;
    };

    const finishJoin = (fromId: string, toId: string) => {
        if (fromId === toId) {
            return;
        }
        const from = mesaById.get(fromId);
        const to = mesaById.get(toId);
        if (!from?.activa || !to?.activa) {
            return;
        }
        // Misma unión ya: no-op
        if (
            from.union_id &&
            to.union_id &&
            from.union_id === to.union_id
        ) {
            resetDrag();
            setJoinSourceId(null);
            onJoinModeChange(false);
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
        const from = centers.get(joinRepId(dragFromId));
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
            sameZona(fromMesa, overMesa) &&
            !(
                fromMesa.union_id &&
                overMesa.union_id &&
                fromMesa.union_id === overMesa.union_id
            )
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

    const startDrag = (
        mesa: MesaSalon,
        e: ReactPointerEvent<HTMLButtonElement>,
    ) => {
        e.preventDefault();
        e.stopPropagation();
        wrapRef.current?.setPointerCapture?.(e.pointerId);
        onJoinModeChange(false);
        setJoinSourceId(null);
        setDragFromId(mesa.id);
        const c = centers.get(joinRepId(mesa.id));
        if (c) {
            setDragLine({ from: c, to: c });
        }
    };

    const itemIsHighlighted = (
        item: GridItem,
    ): 'source' | 'target' | null => {
        const memberIds =
            item.kind === 'solo'
                ? [item.mesa.id]
                : item.mesas.map((m) => m.id);

        if (
            (joinSourceId && memberIds.includes(joinSourceId)) ||
            (dragFromId && memberIds.includes(dragFromId))
        ) {
            return 'source';
        }

        if (
            (hoverTargetId && memberIds.includes(hoverTargetId)) ||
            (joinMode &&
                joinSourceId !== null &&
                !memberIds.includes(joinSourceId) &&
                item.kind === 'solo' &&
                item.mesa.activa &&
                joinSource &&
                sameZona(joinSource, item.mesa)) ||
            (joinMode &&
                joinSourceId !== null &&
                !memberIds.includes(joinSourceId) &&
                item.kind === 'union' &&
                item.mesas.every((m) => m.activa) &&
                joinSource &&
                sameZona(joinSource, item.mesas[0]!))
        ) {
            return 'target';
        }

        return null;
    };

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

            {/* Solo línea temporal de drag (sin uniones permanentes). */}
            <svg
                className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
                aria-hidden
            >
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
                {gridItems.map((item, index) => {
                    const joinHighlight = itemIsHighlighted(item);

                    if (item.kind === 'union') {
                        const rep = item.mesas[0]!;
                        return (
                            <div
                                key={item.key}
                                data-mesa-id={rep.id}
                                data-union-id={item.unionId}
                                ref={(el) => {
                                    if (el) {
                                        cardRefs.current.set(rep.id, el);
                                        for (const m of item.mesas) {
                                            if (m.id !== rep.id) {
                                                cardRefs.current.set(m.id, el);
                                            }
                                        }
                                    } else {
                                        for (const m of item.mesas) {
                                            cardRefs.current.delete(m.id);
                                        }
                                    }
                                }}
                                className="relative z-0 col-span-2 animate-in fade-in zoom-in-95 fill-mode-both duration-300"
                                style={{
                                    animationDelay: `${Math.min(index, 12) * 40}ms`,
                                }}
                            >
                                <MesaUnionCard
                                    mesas={item.mesas}
                                    capacidadTotal={item.capacidad}
                                    mode={mode}
                                    canUpdate={canUpdate}
                                    canDelete={canDelete}
                                    joinHighlight={joinHighlight}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onDissolve={() =>
                                        onDissolveUnion(item.mesas)
                                    }
                                    onSepararOne={onSeparar}
                                    onJoinTap={
                                        mode === 'gestionar' &&
                                        joinMode &&
                                        canUpdate &&
                                        item.mesas.every((m) => m.activa)
                                            ? () => handleJoinTap(rep)
                                            : undefined
                                    }
                                    onJoinDragStart={
                                        mode === 'gestionar' &&
                                        canUpdate &&
                                        item.mesas.every((m) => m.activa)
                                            ? (e) => startDrag(rep, e)
                                            : undefined
                                    }
                                />
                            </div>
                        );
                    }

                    const mesa = item.mesa;

                    return (
                        <div
                            key={item.key}
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
                                mode={mode}
                                canUpdate={canUpdate}
                                canDelete={canDelete}
                                joinHighlight={joinHighlight}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onJoinTap={
                                    mode === 'gestionar' &&
                                    joinMode &&
                                    canUpdate &&
                                    mesa.activa
                                        ? () => handleJoinTap(mesa)
                                        : undefined
                                }
                                onJoinDragStart={
                                    mode === 'gestionar' &&
                                    canUpdate &&
                                    mesa.activa
                                        ? (e) => startDrag(mesa, e)
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

import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isWithinInterval,
    startOfDay,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
    useEffect,
    useMemo,
    useState,
    type KeyboardEvent,
    type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    rangeLast7Days,
    rangeLast30Days,
    rangeLastMonth,
    rangeLastWeek,
    rangeThisMonth,
    rangeThisWeek,
    rangeThisYear,
    rangeToday,
    rangeTomorrow,
    rangeYesterday,
    type DateRange,
} from '@/lib/date-range-presets';
import { cn } from '@/lib/utils';

export type DateRangePresetId =
    | 'today'
    | 'yesterday'
    | 'tomorrow'
    | 'last_7'
    | 'last_30'
    | 'this_week'
    | 'last_week'
    | 'this_month'
    | 'last_month'
    | 'this_year';

type PresetOption = {
    id: DateRangePresetId;
    label: string;
    desde: string;
    hasta: string;
};

export type DateRangeFilterProps = {
    desde: string | null;
    hasta: string | null;
    disabled?: boolean;
    onApply: (desde: string, hasta: string) => void;
    onClear: () => void;
    /** Presets visibles. Default: sin “Mañana” (más útil en operación). */
    presetIds?: readonly DateRangePresetId[];
    triggerClassName?: string;
    align?: 'start' | 'center' | 'end';
    /** Etiqueta del trigger sin rango. */
    emptyLabel?: string;
};

const WEEKDAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'] as const;

const DEFAULT_PRESETS: readonly DateRangePresetId[] = [
    'today',
    'yesterday',
    'last_7',
    'last_30',
    'this_week',
    'last_week',
    'this_month',
    'last_month',
    'this_year',
] as const;

function parseDay(iso: string): Date | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        return undefined;
    }
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) {
        return undefined;
    }
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function toIsoDate(d: Date): string {
    return format(d, 'yyyy-MM-dd');
}

function formatDay(d: Date): string {
    return format(d, 'dd/MM/yyyy', { locale: esLocale });
}

function monthTitle(d: Date): string {
    const raw = format(d, 'MMMM yyyy', { locale: esLocale });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function orderedRange(from?: Date, to?: Date): { start: Date; end: Date } | null {
    if (!from || !to) {
        return null;
    }
    return from <= to ? { start: from, end: to } : { start: to, end: from };
}

function useSheetLayout(): boolean {
    const [sheet, setSheet] = useState(false);

    useEffect(() => {
        const query = window.matchMedia(
            '(max-width: 1023px), (max-height: 760px)',
        );
        const update = () => setSheet(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return sheet;
}

function MonthGrid({
    month,
    from,
    to,
    hover,
    onPick,
    onHover,
}: {
    month: Date;
    from?: Date;
    to?: Date;
    hover?: Date;
    onPick: (day: Date) => void;
    onHover: (day: Date | undefined) => void;
}) {
    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
    });
    const today = startOfDay(new Date());

    // Mientras se elige el fin, previsualiza el rango con el día bajo el cursor.
    const previewTo = to ?? (from && hover ? hover : undefined);
    const range = orderedRange(from, previewTo);

    return (
        <div className="w-[15.5rem]">
            <p className="mb-2 text-center text-sm font-semibold capitalize text-foreground">
                {monthTitle(month)}
            </p>
            <div className="grid grid-cols-7 gap-y-0.5 text-center">
                {WEEKDAYS.map((day) => (
                    <span
                        key={day}
                        className="py-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground"
                    >
                        {day}
                    </span>
                ))}
                {days.map((day) => {
                    const inMonth = isSameMonth(day, month);
                    const isStart = from ? isSameDay(day, from) : false;
                    const isEnd = previewTo ? isSameDay(day, previewTo) : false;
                    const inRange = range
                        ? isWithinInterval(day, range)
                        : false;
                    const single =
                        from && previewTo ? isSameDay(from, previewTo) : false;
                    const endpoint = isStart || isEnd;

                    return (
                        <div
                            key={format(day, 'yyyy-MM-dd')}
                            className={cn(
                                'flex h-8 items-center justify-center',
                                inRange &&
                                    inMonth &&
                                    !single &&
                                    'bg-brand-100/80 dark:bg-brand-950/50',
                                isStart && inRange && 'rounded-l-full',
                                isEnd && inRange && 'rounded-r-full',
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => onPick(startOfDay(day))}
                                onMouseEnter={() =>
                                    onHover(startOfDay(day))
                                }
                                onMouseLeave={() => onHover(undefined)}
                                className={cn(
                                    'flex size-8 cursor-pointer items-center justify-center rounded-full text-sm touch-manipulation transition-colors',
                                    !inMonth && 'text-muted-foreground/40',
                                    inMonth &&
                                        !endpoint &&
                                        'text-foreground hover:bg-brand-50 dark:hover:bg-brand-950/40',
                                    endpoint &&
                                        'bg-brand-600 font-semibold text-white shadow-sm',
                                    isSameDay(day, today) &&
                                        !endpoint &&
                                        'ring-1 ring-brand-600/45',
                                )}
                            >
                                {format(day, 'd')}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function RangePanel({
    presets,
    activePresetId,
    draftFrom,
    draftTo,
    hoverDay,
    viewMonth,
    onViewMonth,
    onPick,
    onHover,
    onPreset,
    onApply,
    onClear,
    compact,
}: {
    presets: PresetOption[];
    activePresetId?: DateRangePresetId;
    draftFrom?: Date;
    draftTo?: Date;
    hoverDay?: Date;
    viewMonth: Date;
    onViewMonth: (month: Date) => void;
    onPick: (day: Date) => void;
    onHover: (day: Date | undefined) => void;
    onPreset: (preset: PresetOption) => void;
    onApply: () => void;
    onClear: () => void;
    compact: boolean;
}) {
    const { t } = useTranslation('common');
    const ordered = orderedRange(draftFrom, draftTo);
    const summary = ordered
        ? `${formatDay(ordered.start)} — ${formatDay(ordered.end)}`
        : t('date_range.pick_hint', {
              defaultValue: 'Elige el inicio y el fin',
          });

    return (
        <div
            className={cn(
                'flex bg-card',
                compact ? 'flex-col' : 'flex-row',
            )}
        >
            <div className="min-w-0 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => onViewMonth(addMonths(viewMonth, -1))}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-foreground hover:bg-brand-50 dark:hover:bg-brand-950/40"
                        aria-label={t('date_range.prev_month', {
                            defaultValue: 'Mes anterior',
                        })}
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <p className="truncate rounded-lg border border-border/80 bg-muted/40 px-3 py-1.5 text-xs font-medium tabular-nums text-foreground">
                        {summary}
                    </p>
                    <button
                        type="button"
                        onClick={() => onViewMonth(addMonths(viewMonth, 1))}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-foreground hover:bg-brand-50 dark:hover:bg-brand-950/40"
                        aria-label={t('date_range.next_month', {
                            defaultValue: 'Mes siguiente',
                        })}
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </div>
                <div
                    className={cn(
                        'gap-4',
                        compact ? 'flex justify-center' : 'flex',
                    )}
                >
                    <MonthGrid
                        month={viewMonth}
                        from={draftFrom}
                        to={draftTo}
                        hover={hoverDay}
                        onPick={onPick}
                        onHover={onHover}
                    />
                    {compact ? null : (
                        <MonthGrid
                            month={addMonths(viewMonth, 1)}
                            from={draftFrom}
                            to={draftTo}
                            hover={hoverDay}
                            onPick={onPick}
                            onHover={onHover}
                        />
                    )}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/70 pt-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClear}
                        className="h-8 cursor-pointer"
                    >
                        {t('actions.clear', { defaultValue: 'Limpiar' })}
                    </Button>
                    <Button
                        type="button"
                        disabled={!draftFrom || !draftTo}
                        onClick={onApply}
                        className="h-8 cursor-pointer bg-brand-600 text-white hover:bg-brand-700"
                    >
                        {t('actions.apply', { defaultValue: 'Aplicar' })}
                    </Button>
                </div>
            </div>
            <div
                className={cn(
                    'border-border/70 bg-muted/30 p-2',
                    compact
                        ? 'grid max-h-40 grid-cols-2 gap-1 overflow-y-auto border-t'
                        : 'flex w-44 shrink-0 flex-col gap-1 overflow-y-auto border-l',
                )}
            >
                {presets.map((preset) => {
                    const active = preset.id === activePresetId;
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => onPreset(preset)}
                            className={cn(
                                'cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                                active
                                    ? 'bg-brand-600 font-semibold text-white shadow-sm'
                                    : 'bg-card text-foreground hover:bg-brand-50 dark:hover:bg-brand-950/40',
                            )}
                        >
                            {preset.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function DateRangeFilter({
    desde,
    hasta,
    disabled,
    onApply,
    onClear,
    presetIds = DEFAULT_PRESETS,
    triggerClassName,
    align = 'end',
    emptyLabel,
}: DateRangeFilterProps) {
    const { t } = useTranslation('common');
    const sheet = useSheetLayout();
    const [open, setOpen] = useState(false);
    const [draftFrom, setDraftFrom] = useState<Date | undefined>();
    const [draftTo, setDraftTo] = useState<Date | undefined>();
    const [hoverDay, setHoverDay] = useState<Date | undefined>();
    const [pickingEnd, setPickingEnd] = useState(false);
    const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));

    const presetBuilders = useMemo(
        (): Record<DateRangePresetId, { labelKey: string; labelFallback: string; range: () => DateRange }> => ({
            today: {
                labelKey: 'date_range.presets.today',
                labelFallback: 'Hoy',
                range: rangeToday,
            },
            yesterday: {
                labelKey: 'date_range.presets.yesterday',
                labelFallback: 'Ayer',
                range: rangeYesterday,
            },
            tomorrow: {
                labelKey: 'date_range.presets.tomorrow',
                labelFallback: 'Mañana',
                range: rangeTomorrow,
            },
            last_7: {
                labelKey: 'date_range.presets.last_7',
                labelFallback: 'Últimos 7 días',
                range: rangeLast7Days,
            },
            last_30: {
                labelKey: 'date_range.presets.last_30',
                labelFallback: 'Últimos 30 días',
                range: rangeLast30Days,
            },
            this_week: {
                labelKey: 'date_range.presets.this_week',
                labelFallback: 'Esta semana',
                range: rangeThisWeek,
            },
            last_week: {
                labelKey: 'date_range.presets.last_week',
                labelFallback: 'Semana pasada',
                range: rangeLastWeek,
            },
            this_month: {
                labelKey: 'date_range.presets.this_month',
                labelFallback: 'Este mes',
                range: rangeThisMonth,
            },
            last_month: {
                labelKey: 'date_range.presets.last_month',
                labelFallback: 'Mes anterior',
                range: rangeLastMonth,
            },
            this_year: {
                labelKey: 'date_range.presets.this_year',
                labelFallback: 'Este año',
                range: rangeThisYear,
            },
        }),
        [],
    );

    const presets = useMemo((): PresetOption[] => {
        return presetIds.flatMap((id) => {
            const def = presetBuilders[id];
            if (!def) {
                return [];
            }
            const range = def.range();
            return [
                {
                    id,
                    label: t(def.labelKey, { defaultValue: def.labelFallback }),
                    desde: toIsoDate(range.from),
                    hasta: toIsoDate(range.to),
                },
            ];
        });
    }, [presetBuilders, presetIds, t]);

    const committedFrom = desde ? parseDay(desde) : undefined;
    const committedTo = hasta ? parseDay(hasta) : undefined;
    const hasRange = Boolean(committedFrom && committedTo);
    const activePresetId = presets.find(
        (preset) => preset.desde === desde && preset.hasta === hasta,
    )?.id;

    const triggerLabel = (() => {
        if (activePresetId === 'this_month') {
            return t('date_range.presets.this_month', {
                defaultValue: 'Este mes',
            });
        }
        if (committedFrom && committedTo) {
            return isSameDay(committedFrom, committedTo)
                ? formatDay(committedFrom)
                : `${formatDay(committedFrom)} — ${formatDay(committedTo)}`;
        }
        return (
            emptyLabel ??
            t('date_range.all_dates', { defaultValue: 'Todas las fechas' })
        );
    })();

    const openPanel = () => {
        const from = committedFrom ?? startOfDay(new Date());
        const to = committedTo ?? from;
        setDraftFrom(committedFrom);
        setDraftTo(committedTo);
        setHoverDay(undefined);
        setPickingEnd(false);
        setViewMonth(startOfMonth(from <= to ? from : to));
        setOpen(true);
    };

    const applyRange = (fromIso: string, toIso: string) => {
        onApply(fromIso, toIso);
        setOpen(false);
    };

    const applyDraft = () => {
        if (!draftFrom || !draftTo) {
            return;
        }
        const ordered = orderedRange(draftFrom, draftTo);
        if (!ordered) {
            return;
        }
        applyRange(toIsoDate(ordered.start), toIsoDate(ordered.end));
    };

    const pickDay = (day: Date) => {
        if (!pickingEnd || !draftFrom) {
            setDraftFrom(day);
            setDraftTo(day);
            setPickingEnd(true);
            setHoverDay(undefined);
            setViewMonth(startOfMonth(day));
            return;
        }
        setDraftTo(day);
        setPickingEnd(false);
        setHoverDay(undefined);
    };

    const applyPreset = (preset: PresetOption) => {
        const from = parseDay(preset.desde);
        const to = parseDay(preset.hasta);
        if (from) {
            setViewMonth(startOfMonth(from));
            setDraftFrom(from);
            setDraftTo(to);
        }
        applyRange(preset.desde, preset.hasta);
    };

    const handleClear = (event?: MouseEvent) => {
        event?.preventDefault();
        event?.stopPropagation();
        onClear();
        setOpen(false);
    };

    const onClearKey = (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClear();
        }
    };

    const panel = (
        <RangePanel
            presets={presets}
            activePresetId={activePresetId}
            draftFrom={draftFrom}
            draftTo={draftTo}
            hoverDay={pickingEnd ? hoverDay : undefined}
            viewMonth={viewMonth}
            onViewMonth={setViewMonth}
            onPick={pickDay}
            onHover={setHoverDay}
            onPreset={applyPreset}
            onApply={applyDraft}
            onClear={() => handleClear()}
            compact={sheet}
        />
    );

    const trigger = (
        <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
                'h-9 max-w-full min-w-40 cursor-pointer justify-start gap-2 rounded-lg border-brand-600 bg-brand-600 px-2.5 font-medium text-white shadow-sm hover:bg-brand-700 hover:text-white',
                !hasRange &&
                    'border-border bg-card text-foreground hover:bg-muted/60 hover:text-foreground',
                triggerClassName,
            )}
            aria-label={t('date_range.aria_filter', {
                defaultValue: 'Filtrar por rango de fechas',
            })}
            onClick={
                sheet ? () => (open ? setOpen(false) : openPanel()) : undefined
            }
        >
            <CalendarIcon
                className={cn(
                    'size-4 shrink-0',
                    hasRange ? 'text-white' : 'text-brand-600',
                )}
            />
            <span className="min-w-0 flex-1 truncate text-left text-sm">
                {triggerLabel}
            </span>
            {hasRange ? (
                <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-white/85 hover:bg-white/15 hover:text-white"
                    aria-label={t('date_range.aria_clear', {
                        defaultValue: 'Quitar filtro de fecha',
                    })}
                    onClick={handleClear}
                    onKeyDown={onClearKey}
                >
                    <X className="size-3.5" />
                </span>
            ) : null}
        </Button>
    );

    if (sheet) {
        return (
            <>
                {trigger}
                {open
                    ? createPortal(
                          <div className="fixed inset-0 z-200 flex items-end justify-center bg-foreground/40 p-3 sm:items-center">
                              <button
                                  type="button"
                                  aria-label={t('date_range.aria_close', {
                                      defaultValue: 'Cerrar filtro de fechas',
                                  })}
                                  className="absolute inset-0 cursor-default"
                                  onClick={() => setOpen(false)}
                              />
                              <div className="relative z-10 max-h-[min(36rem,calc(100dvh-1.5rem))] w-full max-w-md overflow-auto rounded-2xl border border-border/70 bg-card shadow-xl">
                                  {panel}
                              </div>
                          </div>,
                          document.body,
                      )
                    : null}
            </>
        );
    }

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                if (next) {
                    openPanel();
                    return;
                }
                setOpen(false);
            }}
        >
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent
                align={align}
                side="bottom"
                sideOffset={8}
                collisionPadding={16}
                className="w-auto max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border-border/70 p-0 shadow-xl"
            >
                {panel}
            </PopoverContent>
        </Popover>
    );
}

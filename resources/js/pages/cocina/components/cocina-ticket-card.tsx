import { Check, Clock3, CookingPot, StickyNote } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import { formatPeruTime } from '@/lib/format-peru-datetime';
import { cn } from '@/lib/utils';

export type CocinaLinea = {
    id: string;
    nombre: string;
    cantidad: string | number;
    estado: string;
    notas: string | null;
    enviado_at: string | null;
    area?: { id: string; nombre: string } | null;
};

export type CocinaTicket = {
    pedido_id: string;
    numero: number;
    canal: string;
    mesa?: { id: string; codigo: string; nombre: string | null } | null;
    enviado_at: string | null;
    lineas: CocinaLinea[];
};

function waitMinutes(iso: string | null): number | null {
    if (!iso) {
        return null;
    }
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms) || ms < 0) {
        return 0;
    }

    return Math.floor(ms / 60_000);
}

function urgencyTone(minutes: number | null): {
    bar: string;
    chip: string;
    labelKey: 'fresh' | 'warm' | 'hot';
} {
    if (minutes == null || minutes < 5) {
        return {
            bar: 'bg-emerald-500',
            chip: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
            labelKey: 'fresh',
        };
    }
    if (minutes < 12) {
        return {
            bar: 'bg-amber-500',
            chip: 'bg-amber-500/15 text-amber-900 dark:text-amber-300',
            labelKey: 'warm',
        };
    }

    return {
        bar: 'bg-rose-500',
        chip: 'bg-rose-500/15 text-rose-800 dark:text-rose-300',
        labelKey: 'hot',
    };
}

type Props = {
    ticket: CocinaTicket;
    canMarkReady: boolean;
    markingId: string | null;
    onMarkReady: (lineaId: string) => void;
    style?: CSSProperties;
};

export function CocinaTicketCard({
    ticket,
    canMarkReady,
    markingId,
    onMarkReady,
    style,
}: Props) {
    const { t } = useTranslation(['cocina', 'common']);
    const pending = ticket.lineas.filter((l) => l.estado === 'en_cola').length;
    const ready = ticket.lineas.filter((l) => l.estado === 'listo').length;
    const minutes = waitMinutes(ticket.enviado_at);
    const urgency = urgencyTone(minutes);
    const mesaLabel = ticket.mesa
        ? ticket.mesa.nombre?.trim() || ticket.mesa.codigo
        : null;

    return (
        <article
            style={style}
            className={cn(
                'cocina-ticket-enter group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-md',
                pending > 0
                    ? 'border-amber-500/35'
                    : 'border-emerald-500/30',
            )}
        >
            <div
                className={cn('absolute inset-y-0 left-0 w-1.5', urgency.bar)}
                aria-hidden
            />

            <header className="flex items-start justify-between gap-3 border-b border-border/60 py-3 pr-3 pl-4 sm:pl-5">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold tracking-tight text-brand-700 dark:text-brand-400">
                            {mesaLabel
                                ? t('ticket.mesa', { codigo: mesaLabel })
                                : t('ticket.mostrador')}
                        </p>
                        <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {t('ticket.pedido', { numero: ticket.numero })}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-1.5 py-0.5">
                            <CookingPot className="size-3" aria-hidden />
                            {pending > 0
                                ? t('ticket.pending_count', { count: pending })
                                : t('ticket.all_ready')}
                        </span>
                        {ready > 0 && pending > 0 ? (
                            <span className="inline-flex rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-emerald-800 dark:text-emerald-300">
                                {t('ticket.ready_count', { count: ready })}
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                    {minutes != null ? (
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold tabular-nums',
                                urgency.chip,
                            )}
                            title={t(`urgency.${urgency.labelKey}`)}
                        >
                            <Clock3 className="size-3.5" aria-hidden />
                            {t('ticket.wait_min', { count: minutes })}
                        </span>
                    ) : null}
                    {ticket.enviado_at ? (
                        <time className="text-[11px] tabular-nums text-muted-foreground">
                            {formatPeruTime(ticket.enviado_at)}
                        </time>
                    ) : null}
                </div>
            </header>

            <ul className="flex flex-1 flex-col gap-2 p-3 sm:p-3.5">
                {ticket.lineas.map((linea) => {
                    const isReady = linea.estado === 'listo';
                    const isMarking = markingId === linea.id;

                    return (
                        <li
                            key={linea.id}
                            className={cn(
                                'flex items-stretch gap-2 rounded-xl border p-2.5 transition-colors duration-150',
                                isReady
                                    ? 'border-emerald-500/25 bg-emerald-500/8'
                                    : 'border-amber-500/25 bg-amber-500/6',
                            )}
                        >
                            <div className="min-w-0 flex-1 space-y-1">
                                <p className="text-sm leading-snug font-semibold text-foreground sm:text-[15px]">
                                    <span className="mr-1.5 inline-flex min-w-7 justify-center rounded-md bg-background/80 px-1.5 py-0.5 text-sm font-bold tabular-nums text-brand-700 ring-1 ring-border/70 dark:text-brand-300">
                                        {Number(linea.cantidad)}×
                                    </span>
                                    {linea.nombre}
                                </p>
                                {linea.notas ? (
                                    <p className="flex items-start gap-1 text-xs text-amber-900/90 dark:text-amber-200/90">
                                        <StickyNote
                                            className="mt-0.5 size-3 shrink-0"
                                            aria-hidden
                                        />
                                        <span>{linea.notas}</span>
                                    </p>
                                ) : null}
                                {linea.area ? (
                                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                        {linea.area.nombre}
                                    </p>
                                ) : null}
                            </div>

                            {isReady ? (
                                <span className="inline-flex min-h-11 min-w-16 shrink-0 items-center justify-center gap-1 self-center rounded-lg bg-emerald-500/15 px-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                    <Check className="size-3.5" aria-hidden />
                                    {t('actions.listo')}
                                </span>
                            ) : canMarkReady ? (
                                <Can permission="cocina.update">
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={isMarking}
                                        className="min-h-11 min-w-[5.5rem] shrink-0 cursor-pointer gap-1.5 self-center px-3 text-sm font-semibold"
                                        onClick={() => onMarkReady(linea.id)}
                                        aria-label={t('actions.listo_aria', {
                                            nombre: linea.nombre,
                                        })}
                                    >
                                        <Check className="size-4" aria-hidden />
                                        {isMarking
                                            ? t('actions.marking')
                                            : t('actions.listo')}
                                    </Button>
                                </Can>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
        </article>
    );
}

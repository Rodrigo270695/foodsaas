import { router, usePage } from '@inertiajs/react';
import { Bell, CookingPot } from 'lucide-react';
import { useServicioFeedPoll } from '@/hooks/use-servicio-feed-poll';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ServicioFeed } from '@/types/servicio-feed';

function mesaLabel(mesa: { codigo: string; nombre: string | null } | null): string {
    if (!mesa) {
        return 'Mostrador';
    }
    return mesa.nombre?.trim() || mesa.codigo;
}

/**
 * Campana de servicio: platos listos para el mesero que abrió el pedido.
 * El polling vive en useServicioFeedPoll (toast + sonido al llegar uno nuevo).
 */
export function ServicioFeedInbox() {
    useServicioFeedPoll();

    const page = usePage();
    const feed = (page.props as { servicioFeed?: ServicioFeed | null })
        .servicioFeed;

    if (feed == null) {
        return null;
    }

    const items = feed.listos;
    const count = items.length;
    const hasMessages = count > 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'relative size-9 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground',
                        hasMessages && 'text-brand-700 dark:text-brand-400',
                    )}
                    aria-label={
                        hasMessages
                            ? `${count} platos listos para servir`
                            : 'Avisos de cocina'
                    }
                >
                    <Bell
                        className={cn(
                            'size-4',
                            hasMessages &&
                                'animate-[svcBlink_1.1s_ease-in-out_infinite]',
                        )}
                    />
                    {hasMessages ? (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 animate-[svcBlink_1.1s_ease-in-out_infinite] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                            {count > 9 ? '9+' : count}
                        </span>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-[min(22rem,calc(100vw-1.5rem))] p-3"
            >
                <p className="text-sm font-medium text-foreground">
                    Cocina → Salón
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Platos marcados como listos en tus pedidos activos.
                </p>

                {items.length === 0 ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                        No hay platos listos pendientes de retirar.
                    </p>
                ) : (
                    <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                        {items.map((item) => (
                            <li
                                key={item.id}
                                className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-2"
                            >
                                <p className="text-xs font-semibold text-foreground">
                                    {Number(item.cantidad) > 1
                                        ? `${item.cantidad}× `
                                        : ''}
                                    {item.nombre}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <CookingPot className="size-3 shrink-0" />
                                    Pedido #{item.numero ?? '—'} ·{' '}
                                    {mesaLabel(item.mesa)}
                                </p>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="mt-2 h-7 w-full cursor-pointer text-xs"
                                    onClick={() =>
                                        router.visit(
                                            `/pedidos/${item.pedido_id}`,
                                        )
                                    }
                                >
                                    Abrir pedido
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </DropdownMenuContent>
            <style>{`
                @keyframes svcBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .animate-\\[svcBlink_1\\.1s_ease-in-out_infinite\\] {
                        animation: none !important;
                    }
                }
            `}</style>
        </DropdownMenu>
    );
}

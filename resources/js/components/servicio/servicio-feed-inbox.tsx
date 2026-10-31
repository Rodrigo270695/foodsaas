import { router, usePage } from '@inertiajs/react';
import { Bell, Check, ChefHat, CookingPot } from 'lucide-react';
import { useServicioFeedPoll } from '@/hooks/use-servicio-feed-poll';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import pedidos from '@/pages/pedidos/pedidos-routes';
import type { ServicioFeed, ServicioListoItem } from '@/types/servicio-feed';

function mesaLabel(
    mesa: { codigo: string; nombre: string | null } | null,
): string {
    if (!mesa) {
        return 'Mostrador';
    }
    return mesa.nombre?.trim() || mesa.codigo;
}

function ItemMeta({ item }: { item: ServicioListoItem }) {
    return (
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <CookingPot className="size-3 shrink-0" aria-hidden />
            Pedido #{item.numero ?? '—'} · {mesaLabel(item.mesa)}
            {item.area ? ` · ${item.area.nombre}` : ''}
        </p>
    );
}

/**
 * Campana dual:
 * - Mesero: platos listos → «Llevé a mesa» (se quitan del badge)
 * - Cocinero: cola entrante → ir a cocina / ver ticket
 * Sin parpadeo agresivo: badge estático + acento de color.
 */
export function ServicioFeedInbox() {
    useServicioFeedPoll();

    const page = usePage();
    const feed = (page.props as { servicioFeed?: ServicioFeed | null })
        .servicioFeed;

    if (feed == null) {
        return null;
    }

    const listos = feed.listos ?? [];
    const cola = feed.cola ?? [];
    const count = listos.length + cola.length;
    const hasMessages = count > 0;

    function marcarEntregado(item: ServicioListoItem) {
        router.post(
            pedidos.lineas.entregado(item.pedido_id, item.id).url,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: ['servicioFeed', 'pedido'],
            },
        );
    }

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
                            ? `${count} avisos de servicio`
                            : 'Avisos de servicio'
                    }
                >
                    <Bell className="size-4" />
                    {hasMessages ? (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white ring-2 ring-background">
                            {count > 9 ? '9+' : count}
                        </span>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-[min(22.5rem,calc(100vw-1.5rem))] p-0"
            >
                <div className="border-b border-border/70 px-3 py-2.5">
                    <p className="text-sm font-medium text-foreground">
                        Avisos de servicio
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Cocina ↔ salón · sin parpadeos, con acción clara.
                    </p>
                </div>

                <div className="max-h-[min(24rem,70dvh)] space-y-3 overflow-y-auto p-3">
                    {/* Mesero: listos por llevar */}
                    {listos.length > 0 ? (
                        <section className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-[11px] font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
                                    Listos para servir
                                </h3>
                                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-emerald-800 dark:text-emerald-300">
                                    {listos.length}
                                </span>
                            </div>
                            <ul className="space-y-2">
                                {listos.map((item) => (
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
                                        <ItemMeta item={item} />
                                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-8 cursor-pointer text-xs"
                                                onClick={() =>
                                                    router.visit(
                                                        `/pedidos/${item.pedido_id}`,
                                                    )
                                                }
                                            >
                                                Abrir
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-8 cursor-pointer gap-1 text-xs"
                                                onClick={() =>
                                                    marcarEntregado(item)
                                                }
                                            >
                                                <Check className="size-3.5" />
                                                Llevé a mesa
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}

                    {/* Cocinero: cola entrante */}
                    {cola.length > 0 ? (
                        <section className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-[11px] font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
                                    Llegaron a cocina
                                </h3>
                                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-amber-800 dark:text-amber-300">
                                    {cola.length}
                                </span>
                            </div>
                            <ul className="space-y-2">
                                {cola.map((item) => (
                                    <li
                                        key={item.id}
                                        className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-2"
                                    >
                                        <p className="text-xs font-semibold text-foreground">
                                            {Number(item.cantidad) > 1
                                                ? `${item.cantidad}× `
                                                : ''}
                                            {item.nombre}
                                        </p>
                                        <ItemMeta item={item} />
                                    </li>
                                ))}
                            </ul>
                            <Button
                                type="button"
                                size="sm"
                                className="h-8 w-full cursor-pointer gap-1.5 text-xs"
                                onClick={() => router.visit('/cocina')}
                            >
                                <ChefHat className="size-3.5" />
                                Abrir cocina
                            </Button>
                        </section>
                    ) : null}

                    {!hasMessages ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                            Sin avisos pendientes.
                        </p>
                    ) : null}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

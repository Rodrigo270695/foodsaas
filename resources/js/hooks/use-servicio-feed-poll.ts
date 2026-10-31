import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { playNotifyChime } from '@/lib/notification-sound';
import { toastManager } from '@/lib/toast';
import type { ServicioFeed, ServicioListoItem } from '@/types/servicio-feed';

const POLL_MS = 8000;
const SEEN_LISTOS_KEY = 'foodsaas.servicioFeed.seenListos';
const SEEN_COLA_KEY = 'foodsaas.servicioFeed.seenCola';

function readSeen(key: string): Set<string> {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) {
            return new Set();
        }
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
            return new Set();
        }
        return new Set(parsed.filter((v): v is string => typeof v === 'string'));
    } catch {
        return new Set();
    }
}

function writeSeen(key: string, ids: Set<string>): void {
    try {
        sessionStorage.setItem(key, JSON.stringify([...ids].slice(-100)));
    } catch {
        // ignore quota
    }
}

function mesaLabel(item: ServicioListoItem): string {
    if (!item.mesa) {
        return 'Mostrador';
    }
    return item.mesa.nombre?.trim() || item.mesa.codigo;
}

/**
 * Polling del feed: toasts/sonidos al llegar listos (mesero) o cola (cocina).
 */
export function useServicioFeedPoll(): void {
    const page = usePage();
    const feed = (page.props as { servicioFeed?: ServicioFeed | null })
        .servicioFeed;
    const knownSig = useRef<string | null>(null);
    const bootstrapped = useRef(false);

    useEffect(() => {
        if (feed == null) {
            return;
        }

        const timer = window.setInterval(() => {
            router.reload({
                only: ['servicioFeed'],
                preserveState: true,
                preserveScroll: true,
            });
        }, POLL_MS);

        return () => window.clearInterval(timer);
    }, [feed == null]);

    useEffect(() => {
        if (feed == null) {
            return;
        }

        const cola = feed.cola ?? [];
        const listos = feed.listos ?? [];

        if (!bootstrapped.current) {
            bootstrapped.current = true;
            knownSig.current = feed.signature;
            const seenListos = readSeen(SEEN_LISTOS_KEY);
            const seenCola = readSeen(SEEN_COLA_KEY);
            for (const item of listos) {
                seenListos.add(item.id);
            }
            for (const item of cola) {
                seenCola.add(item.id);
            }
            writeSeen(SEEN_LISTOS_KEY, seenListos);
            writeSeen(SEEN_COLA_KEY, seenCola);
            return;
        }

        if (knownSig.current === feed.signature) {
            return;
        }
        knownSig.current = feed.signature;

        const seenListos = readSeen(SEEN_LISTOS_KEY);
        const nuevosListos = listos.filter((item) => !seenListos.has(item.id));
        if (nuevosListos.length > 0) {
            for (const item of nuevosListos) {
                seenListos.add(item.id);
            }
            writeSeen(SEEN_LISTOS_KEY, seenListos);

            const first = nuevosListos[0];
            const extra =
                nuevosListos.length > 1
                    ? ` (+${nuevosListos.length - 1} más)`
                    : '';
            playNotifyChime('ready');
            toastManager.success({
                title: 'Listo para servir',
                description: `${first.nombre} · Pedido #${first.numero ?? '—'} · ${mesaLabel(first)}${extra}`,
                duration: 6000,
            });
        }

        const seenCola = readSeen(SEEN_COLA_KEY);
        const nuevosCola = cola.filter((item) => !seenCola.has(item.id));
        if (nuevosCola.length > 0) {
            for (const item of nuevosCola) {
                seenCola.add(item.id);
            }
            writeSeen(SEEN_COLA_KEY, seenCola);

            // En /cocina ya hay chime propio; aquí avisamos si el cocinero está en otra pantalla
            const onCocina = window.location.pathname.includes('/cocina');
            if (!onCocina) {
                const first = nuevosCola[0];
                const extra =
                    nuevosCola.length > 1
                        ? ` (+${nuevosCola.length - 1} más)`
                        : '';
                playNotifyChime('kitchen');
                toastManager.info({
                    title: 'Nuevo pedido en cocina',
                    description: `${first.nombre} · Pedido #${first.numero ?? '—'} · ${mesaLabel(first)}${extra}`,
                    duration: 5500,
                });
            }
        }
    }, [feed]);
}

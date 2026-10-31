import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { playNotifyChime } from '@/lib/notification-sound';
import { toastManager } from '@/lib/toast';
import type { ServicioFeed, ServicioListoItem } from '@/types/servicio-feed';

const POLL_MS = 8000;
const SEEN_KEY = 'foodsaas.servicioFeed.seenListos';

function readSeen(): Set<string> {
    try {
        const raw = sessionStorage.getItem(SEEN_KEY);
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

function writeSeen(ids: Set<string>): void {
    try {
        sessionStorage.setItem(
            SEEN_KEY,
            JSON.stringify([...ids].slice(-80)),
        );
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
 * Polling del feed compartido (estilo Agrovision observation inbox).
 * Mesero: toast + sonido cuando cocina marca un plato como listo.
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

        if (!bootstrapped.current) {
            bootstrapped.current = true;
            knownSig.current = feed.signature;
            const seen = readSeen();
            for (const item of feed.listos) {
                seen.add(item.id);
            }
            writeSeen(seen);
            return;
        }

        if (knownSig.current === feed.signature) {
            return;
        }
        knownSig.current = feed.signature;

        const seen = readSeen();
        const nuevos = feed.listos.filter((item) => !seen.has(item.id));

        if (nuevos.length === 0) {
            return;
        }

        for (const item of nuevos) {
            seen.add(item.id);
        }
        writeSeen(seen);

        const first = nuevos[0];
        const extra = nuevos.length > 1 ? ` (+${nuevos.length - 1} más)` : '';

        playNotifyChime('ready');
        toastManager.success({
            title: 'Listo para servir',
            description: `${first.nombre} · Pedido #${first.numero ?? '—'} · ${mesaLabel(first)}${extra}`,
            duration: 6000,
        });
    }, [feed]);
}

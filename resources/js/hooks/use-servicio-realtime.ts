import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import {
    getSharedServicioEcho,
    type BroadcastConfig,
} from '@/lib/servicio-echo';

export const SERVICIO_CHANGED_EVENT = 'foodsaas:servicio-changed';

type ServicioPayload = {
    action?: string;
    pedido_id?: string | null;
    linea_id?: string | null;
    actor_id?: number | null;
    sede_id?: string | null;
};

type ActiveSede = {
    id?: string | null;
} | null;

type PageBroadcastProps = {
    tenant?: { id?: string | null } | null;
    active_sede?: ActiveSede;
    broadcast?: BroadcastConfig;
};

/**
 * Suscribe al canal privado de la sede activa.
 * Emite `foodsaas:servicio-changed` y dispara reload parcial del feed.
 * Si Reverb no está activo, no hace nada (el poll queda como fallback).
 */
export function useServicioRealtime(enabled = true): boolean {
    const page = usePage<PageBroadcastProps>();
    const tenantId = page.props.tenant?.id ?? null;
    const sedeId = page.props.active_sede?.id ?? null;
    const config = page.props.broadcast;
    const wsEnabled = Boolean(config?.enabled && config.key);
    const reloadTimer = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled || !tenantId || !sedeId || !wsEnabled || !config) {
            return;
        }

        let cancelled = false;
        let channelName: string | null = null;
        const echoConfig: BroadcastConfig = {
            enabled: true,
            key: config.key,
            host: config.host,
            port: config.port ?? undefined,
            scheme: config.scheme ?? undefined,
        };

        const scheduleReload = (payload: ServicioPayload) => {
            window.dispatchEvent(
                new CustomEvent(SERVICIO_CHANGED_EVENT, { detail: payload }),
            );

            if (reloadTimer.current !== null) {
                window.clearTimeout(reloadTimer.current);
            }
            reloadTimer.current = window.setTimeout(() => {
                router.reload({
                    only: ['servicioFeed'],
                    preserveState: true,
                    preserveScroll: true,
                });
            }, 120);
        };

        void (async () => {
            const echo = await getSharedServicioEcho(echoConfig);
            if (!echo || cancelled) {
                return;
            }

            channelName = `tenant.${tenantId}.sede.${sedeId}.servicio`;
            const channel = echo.private(channelName);
            channel.listen('.servicio.updated', (raw: unknown) => {
                scheduleReload((raw ?? {}) as ServicioPayload);
            });
        })();

        return () => {
            cancelled = true;
            if (reloadTimer.current !== null) {
                window.clearTimeout(reloadTimer.current);
                reloadTimer.current = null;
            }
            if (!channelName) {
                return;
            }
            void getSharedServicioEcho(echoConfig).then((echo) => {
                echo?.leave?.(channelName as string);
            });
        };
    }, [
        config,
        enabled,
        sedeId,
        tenantId,
        wsEnabled,
        config?.host,
        config?.key,
        config?.port,
        config?.scheme,
    ]);

    return wsEnabled;
}

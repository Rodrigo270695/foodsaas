import { router } from '@inertiajs/react';
import { toastManager } from '@/lib/toast';
import type { MesaSalon } from '../types';

export type PedidoAccessOpts = {
    userId?: number | string | null;
    canViewAll?: boolean;
    ajenoMessage?: string;
};

function canOpenPedido(
    openedBy: number | string | null | undefined,
    opts?: PedidoAccessOpts,
): boolean {
    if (opts?.canViewAll) {
        return true;
    }
    if (opts?.userId == null || openedBy == null) {
        // Sin opened_by conocido: el backend decide (403 si aplica).
        return true;
    }

    return String(openedBy) === String(opts.userId);
}

/**
 * Acción primaria del piso operativo: abrir comanda activa o crear una nueva.
 */
export function openOrCreateMesaPedido(
    mesa: MesaSalon,
    opts?: PedidoAccessOpts,
): void {
    const pedido = mesa.pedidos?.[0];
    if (pedido) {
        if (!canOpenPedido(pedido.opened_by, opts)) {
            toastManager.warning({
                title: opts?.ajenoMessage ?? 'Pedido de otro mesero',
            });
            return;
        }
        router.visit(`/pedidos/${pedido.id}`);
        return;
    }

    if (!mesa.activa) {
        return;
    }

    router.post('/pedidos', {
        canal: 'salon',
        mesa_id: mesa.id,
        comensales: mesa.capacidad || 1,
    });
}

/**
 * En un grupo unido: prioriza mesa con pedido; si no, la primera activa.
 */
export function openOrCreateUnionPedido(
    mesas: MesaSalon[],
    opts?: PedidoAccessOpts,
): void {
    const ocupada = mesas.find((m) => m.pedidos?.[0]);
    if (ocupada) {
        openOrCreateMesaPedido(ocupada, opts);
        return;
    }

    const libre = mesas.find((m) => m.activa);
    if (libre) {
        openOrCreateMesaPedido(libre, opts);
    }
}

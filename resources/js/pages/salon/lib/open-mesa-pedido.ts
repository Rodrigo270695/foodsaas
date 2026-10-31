import { router } from '@inertiajs/react';
import type { MesaSalon } from '../types';

/**
 * Acción primaria del piso operativo: abrir comanda activa o crear una nueva.
 */
export function openOrCreateMesaPedido(mesa: MesaSalon): void {
    const pedido = mesa.pedidos?.[0];
    if (pedido) {
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
export function openOrCreateUnionPedido(mesas: MesaSalon[]): void {
    const ocupada = mesas.find((m) => m.pedidos?.[0]);
    if (ocupada) {
        openOrCreateMesaPedido(ocupada);
        return;
    }

    const libre = mesas.find((m) => m.activa);
    if (libre) {
        openOrCreateMesaPedido(libre);
    }
}

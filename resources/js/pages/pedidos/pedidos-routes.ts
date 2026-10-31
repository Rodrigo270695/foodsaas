const base = '/pedidos';

const pedidos = {
    index: () => ({ url: base }),
    store: () => ({ url: base }),
    show: (id: string | number) => ({ url: `${base}/${id}` }),
    lineas: {
        store: (pedidoId: string | number) => ({
            url: `${base}/${pedidoId}/lineas`,
        }),
        update: (pedidoId: string | number, lineaId: string | number) => ({
            url: `${base}/${pedidoId}/lineas/${lineaId}`,
        }),
        destroy: (pedidoId: string | number, lineaId: string | number) => ({
            url: `${base}/${pedidoId}/lineas/${lineaId}`,
        }),
    },
    enviar: (id: string | number) => ({ url: `${base}/${id}/enviar` }),
    anular: (id: string | number) => ({ url: `${base}/${id}/anular` }),
};

export default pedidos;

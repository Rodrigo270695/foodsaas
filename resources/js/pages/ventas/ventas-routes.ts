const base = '/ventas';

const ventas = {
    index: () => ({ url: base }),
    desdePedido: (pedidoId: string | number) => ({
        url: `${base}/desde-pedido/${pedidoId}`,
    }),
    cobrar: (pedidoId: string | number) => ({
        url: `${base}/cobrar/${pedidoId}`,
    }),
};

export default ventas;

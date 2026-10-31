const base = '/caja';

const caja = {
    index: () => ({ url: base }),
    abrir: () => ({ url: `${base}/abrir` }),
    cerrar: () => ({ url: `${base}/cerrar` }),
    cobrar: (pedidoId: string | number) => ({
        url: `${base}/cobrar/${pedidoId}`,
    }),
};

export default caja;

const base = '/insumos';

const insumos = {
    index: () => ({ url: base }),
    store: () => ({ url: base }),
    update: (id: string) => ({ url: `${base}/${id}` }),
    destroy: (id: string) => ({ url: `${base}/${id}` }),
    movimientos: {
        store: (id: string) => ({ url: `${base}/${id}/movimientos` }),
    },
};

export default insumos;

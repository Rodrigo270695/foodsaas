/**
 * URLs de carta sin Wayfinder.
 */
const base = '/carta';

const carta = {
    index: () => ({ url: base }),
    categorias: {
        store: () => ({ url: `${base}/categorias` }),
        update: (id: string | number) => ({ url: `${base}/categorias/${id}` }),
        destroy: (id: string | number) => ({ url: `${base}/categorias/${id}` }),
    },
    productos: {
        store: () => ({ url: `${base}/productos` }),
        update: (id: string | number) => ({ url: `${base}/productos/${id}` }),
        destroy: (id: string | number) => ({ url: `${base}/productos/${id}` }),
    },
};

export default carta;

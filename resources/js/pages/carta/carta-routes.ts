/**
 * URLs de carta sin Wayfinder.
 */
const base = '/carta';

const carta = {
    index: () => ({ url: base }),
    builder: () => ({ url: `${base}/armar` }),
    menus: {
        index: () => ({ url: `${base}/armar` }),
        store: () => ({ url: `${base}/armar` }),
        edit: (id: string | number) => ({ url: `${base}/armar/${id}` }),
        preview: (id: string | number) => ({ url: `${base}/armar/${id}/vista` }),
        update: (id: string | number) => ({ url: `${base}/armar/${id}` }),
        syncItems: (id: string | number) => ({ url: `${base}/armar/${id}/items` }),
        destroy: (id: string | number) => ({ url: `${base}/armar/${id}` }),
    },
    areas: {
        store: () => ({ url: `${base}/areas` }),
        destroy: (id: string | number) => ({ url: `${base}/areas/${id}` }),
    },
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

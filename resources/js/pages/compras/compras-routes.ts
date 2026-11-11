const base = '/compras';
const proveedoresBase = '/proveedores';

const compras = {
    index: () => ({ url: base }),
    create: () => ({ url: `${base}/nueva` }),
    store: () => ({ url: base }),
    show: (id: string) => ({ url: `${base}/${id}` }),
    edit: (id: string) => ({ url: `${base}/${id}/editar` }),
    update: (id: string) => ({ url: `${base}/${id}` }),
    destroy: (id: string) => ({ url: `${base}/${id}` }),
    emitir: (id: string) => ({ url: `${base}/${id}/emitir` }),
    anular: (id: string) => ({ url: `${base}/${id}/anular` }),
    recibir: (id: string) => ({ url: `${base}/${id}/recibir` }),
    proveedores: {
        index: () => ({ url: proveedoresBase }),
        store: () => ({ url: proveedoresBase }),
        update: (id: string) => ({ url: `${proveedoresBase}/${id}` }),
        destroy: (id: string) => ({ url: `${proveedoresBase}/${id}` }),
    },
};

export default compras;

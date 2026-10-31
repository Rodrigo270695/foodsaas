const base = '/caja';

const caja = {
    index: () => ({ url: base }),
    abrir: () => ({ url: `${base}/abrir` }),
    cerrar: () => ({ url: `${base}/cerrar` }),
    reabrir: (id: string) => ({ url: `${base}/${id}/reabrir` }),
    arqueo: (id: string) => ({ url: `${base}/${id}/arqueo` }),
    arqueoPdf: (id: string) => ({ url: `${base}/${id}/arqueo-pdf` }),
    egresos: {
        store: () => ({ url: `${base}/egresos` }),
    },
};

export default caja;

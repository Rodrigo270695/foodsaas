const base = '/caja';

const caja = {
    index: () => ({ url: base }),
    abrir: () => ({ url: `${base}/abrir` }),
    cerrar: () => ({ url: `${base}/cerrar` }),
    egresos: {
        store: () => ({ url: `${base}/egresos` }),
    },
};

export default caja;

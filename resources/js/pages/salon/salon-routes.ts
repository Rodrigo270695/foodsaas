/**
 * URLs de salón sin Wayfinder.
 */
const base = '/salon';

const salon = {
    index: () => ({ url: base }),
    copyToSede: () => ({ url: `${base}/copy-to-sede` }),
    zonas: {
        store: () => ({ url: `${base}/zonas` }),
        update: (id: string | number) => ({ url: `${base}/zonas/${id}` }),
        destroy: (id: string | number) => ({ url: `${base}/zonas/${id}` }),
    },
    mesas: {
        store: () => ({ url: `${base}/mesas` }),
        update: (id: string | number) => ({ url: `${base}/mesas/${id}` }),
        destroy: (id: string | number) => ({ url: `${base}/mesas/${id}` }),
    },
};

export default salon;

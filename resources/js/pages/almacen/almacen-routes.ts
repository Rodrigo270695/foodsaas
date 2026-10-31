/**
 * URLs de almacén sin Wayfinder.
 */
const base = '/almacen';

const almacen = {
    index: () => ({ url: base }),
    export: () => ({ url: `${base}/export` }),
    kardex: (id: string | number) => ({ url: `${base}/${id}/kardex` }),
    kardexExport: (id: string | number) => ({
        url: `${base}/${id}/kardex/export`,
    }),
    movimientos: {
        index: () => ({ url: `${base}/movimientos` }),
        export: () => ({ url: `${base}/movimientos/export` }),
        store: (id: string | number) => ({ url: `${base}/${id}/movimientos` }),
    },
};

export default almacen;

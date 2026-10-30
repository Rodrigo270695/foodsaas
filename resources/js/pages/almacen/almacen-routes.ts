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
        store: (id: string | number) => ({ url: `${base}/${id}/movimientos` }),
    },
};

export default almacen;

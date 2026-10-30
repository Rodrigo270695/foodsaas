/**
 * URLs de sedes sin Wayfinder.
 * `resources/js/routes` se genera en el build y no está en git; si el
 * caché de rutas del servidor es viejo, Wayfinder no emite este módulo
 * y el build falla.
 */
const base = '/configuracion/sedes';

const sedes = {
    index: () => ({ url: base }),
    store: () => ({ url: base }),
    update: (id: string | number) => ({ url: `${base}/${id}` }),
    destroy: (id: string | number) => ({ url: `${base}/${id}` }),
    bulkDestroy: () => ({ url: `${base}/bulk` }),
    export: () => ({ url: `${base}/export` }),
};

export default sedes;

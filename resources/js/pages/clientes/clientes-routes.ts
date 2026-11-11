const base = '/clientes';
/** Mismo namespace que usuarios: /configuracion/.../consulta-dni */
const consultaBase = '/configuracion/clientes';

const clientes = {
    index: (query?: Record<string, string | number | null | undefined>) => {
        if (!query) {
            return { url: base };
        }
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            if (value === null || value === undefined || value === '') {
                continue;
            }
            params.set(key, String(value));
        }
        const qs = params.toString();
        return { url: qs ? `${base}?${qs}` : base };
    },
    store: () => ({ url: base }),
    update: (id: string) => ({ url: `${base}/${id}` }),
    destroy: (id: string) => ({ url: `${base}/${id}` }),
    credito: (id: string) => ({ url: `${base}/${id}/credito` }),
    /** Igual que `/configuracion/usuarios/consulta-dni` */
    consultaDni: (dni: string) => ({
        url: `${consultaBase}/consulta-dni?dni=${encodeURIComponent(dni)}`,
    }),
    consultaRuc: (ruc: string) => ({
        url: `${consultaBase}/consulta-ruc?ruc=${encodeURIComponent(ruc)}`,
    }),
};

export default clientes;

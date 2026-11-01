const base = '/ventas';

const ventas = {
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
    pendientes: () => ({ url: `${base}/pendientes` }),
    export: () => ({ url: `${base}/export` }),
    create: () => ({ url: `${base}/nueva` }),
    store: () => ({ url: base }),
    consultaDni: (dni: string) => ({
        url: `${base}/consulta-dni?dni=${encodeURIComponent(dni)}`,
    }),
    consultaRuc: (ruc: string) => ({
        url: `${base}/consulta-ruc?ruc=${encodeURIComponent(ruc)}`,
    }),
    desdePedido: (pedidoId: string | number) => ({
        url: `${base}/desde-pedido/${pedidoId}`,
    }),
    cobrar: (pedidoId: string | number) => ({
        url: `${base}/cobrar/${pedidoId}`,
    }),
    ticketPdf: (ventaId: string | number) => ({
        url: `${base}/${ventaId}/ticket-pdf`,
    }),
};

export default ventas;

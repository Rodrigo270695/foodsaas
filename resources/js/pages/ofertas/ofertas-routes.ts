const base = '/ofertas';

const ofertas = {
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
};

export default ofertas;

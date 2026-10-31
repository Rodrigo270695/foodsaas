const base = '/cocina';

const cocina = {
    index: () => ({ url: base }),
    listo: (lineaId: string | number) => ({
        url: `${base}/lineas/${lineaId}/listo`,
    }),
};

export default cocina;

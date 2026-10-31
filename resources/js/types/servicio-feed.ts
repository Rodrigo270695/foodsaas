export type ServicioListoItem = {
    id: string;
    pedido_id: string;
    numero: number | null;
    nombre: string;
    cantidad: number;
    listo_at: string | null;
    mesa: { codigo: string; nombre: string | null } | null;
};

export type ServicioFeed = {
    enabled: boolean;
    signature: string;
    listos: ServicioListoItem[];
    cocina: { en_cola: number; signature: string } | null;
};

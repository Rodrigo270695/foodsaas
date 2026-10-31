export type ServicioListoItem = {
    id: string;
    pedido_id: string;
    numero: number | null;
    nombre: string;
    cantidad: number;
    listo_at: string | null;
    mesa: { codigo: string; nombre: string | null } | null;
    enviado_at?: string | null;
    area?: { id: string; nombre: string } | null;
};

export type ServicioFeed = {
    enabled: boolean;
    signature: string;
    listos: ServicioListoItem[];
    /** Ítems en cola (vista cocina / campana del cocinero). */
    cola: ServicioListoItem[];
    cocina: { en_cola: number; signature: string } | null;
};

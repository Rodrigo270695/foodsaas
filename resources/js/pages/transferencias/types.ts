export type TransferenciaEstado =
    'borrador' | 'enviada' | 'recibida' | 'anulada';

export const TRANSFERENCIA_ESTADO_VARIANT: Record<
    TransferenciaEstado,
    'muted' | 'info' | 'success' | 'danger'
> = {
    borrador: 'muted',
    enviada: 'info',
    recibida: 'success',
    anulada: 'danger',
};

export const transferenciasUrl = {
    index: '/transferencias',
    create: '/transferencias/nueva',
    store: '/transferencias',
    show: (id: string) => `/transferencias/${id}`,
    enviar: (id: string) => `/transferencias/${id}/enviar`,
    recibir: (id: string) => `/transferencias/${id}/recibir`,
    anular: (id: string) => `/transferencias/${id}/anular`,
    itemsSede: (sedeId: string) =>
        `/transferencias/items-sede?sede_id=${encodeURIComponent(sedeId)}`,
};

export type TransferenciaListRow = {
    id: string;
    numero: number;
    estado: TransferenciaEstado;
    origen: string | null;
    destino: string | null;
    lineas_count: number;
    enviada_at: string | null;
    recibida_at: string | null;
};

export type TransferenciaLineaRow = {
    id: string;
    tipo: 'insumo' | 'producto';
    origen: string | null;
    destino: string | null;
    cantidad: number;
    unidad: string;
};

export type TransferenciaDetail = {
    id: string;
    numero: number;
    estado: TransferenciaEstado;
    notas: string | null;
    origen: string | null;
    destino: string | null;
    can_enviar: boolean;
    can_recibir: boolean;
    can_anular: boolean;
    lineas: TransferenciaLineaRow[];
};

export type SedeOption = { id: string; nombre: string };

export type SedeItems = {
    insumos: { id: string; nombre: string; unidad: string; stock: number }[];
    productos: { id: string; nombre: string; stock: number }[];
};

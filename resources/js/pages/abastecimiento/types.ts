export type RequerimientoEstado =
    | 'borrador'
    | 'solicitado'
    | 'aprobado'
    | 'atendido'
    | 'rechazado'
    | 'anulado';

export type Prioridad = 'baja' | 'normal' | 'alta';

export const REQUERIMIENTO_ESTADO_VARIANT: Record<
    RequerimientoEstado,
    'muted' | 'info' | 'warning' | 'success' | 'danger'
> = {
    borrador: 'muted',
    solicitado: 'info',
    aprobado: 'warning',
    atendido: 'success',
    rechazado: 'danger',
    anulado: 'danger',
};

export const abastecimientoUrl = {
    index: '/abastecimiento',
    create: '/abastecimiento/nuevo',
    store: '/abastecimiento',
    show: (id: string) => `/abastecimiento/${id}`,
    solicitar: (id: string) => `/abastecimiento/${id}/solicitar`,
    aprobar: (id: string) => `/abastecimiento/${id}/aprobar`,
    rechazar: (id: string) => `/abastecimiento/${id}/rechazar`,
    generarTransferencia: (id: string) =>
        `/abastecimiento/${id}/generar-transferencia`,
};

export type RequerimientoListRow = {
    id: string;
    numero: number;
    estado: RequerimientoEstado;
    prioridad: Prioridad;
    solicitante: string | null;
    abastecedora: string | null;
    lineas_count: number;
    fecha_necesaria: string | null;
};

export type RequerimientoLineaRow = {
    id: string;
    tipo: 'insumo' | 'producto';
    nombre: string;
    cantidad: number;
    unidad: string;
};

export type RequerimientoDetail = {
    id: string;
    numero: number;
    estado: RequerimientoEstado;
    prioridad: Prioridad;
    notas: string | null;
    fecha_necesaria: string | null;
    solicitante: string | null;
    abastecedora: string | null;
    transferencia: { id: string; numero: number; estado: string } | null;
    lineas: RequerimientoLineaRow[];
};

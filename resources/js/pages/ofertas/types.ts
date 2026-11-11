export type OfertaTipo = 'monto' | 'porcentaje';

export type OfertaRow = {
    id: string;
    codigo: string;
    nombre: string;
    tipo: OfertaTipo;
    valor: number;
    tope_monto: number | null;
    usos_max: number | null;
    usos_count: number;
    vigente_desde: string | null;
    vigente_hasta: string | null;
    activa: boolean;
    vigente_hoy: boolean;
};

export type OfertaEstadoFilter = 'activos' | 'inactivos' | 'todos';

export type OfertaFilters = {
    search: string;
    estado: OfertaEstadoFilter;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
};

export type OfertaStats = {
    total: number;
    activos: number;
    vigentes: number;
    filtros: number;
    coincidencias: number;
};

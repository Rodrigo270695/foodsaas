export type SedeOpcion = {
    id: string;
    nombre: string;
    codigo: string;
};

export type ZonaSalon = {
    id: string;
    sede_id: string;
    nombre: string;
    orden: number;
    activa: boolean;
    mesas_count?: number;
};

export type MesaZonaRef = {
    id: string;
    nombre: string;
};

export type MesaPedidoActivo = {
    id: string;
    mesa_id: string;
    numero: number;
    estado: string;
    total: string | number;
    comensales: number;
};

export type MesaSalon = {
    id: string;
    sede_id: string;
    zona_id: string;
    codigo: string;
    nombre: string | null;
    capacidad: number;
    activa: boolean;
    /** Mesas con el mismo union_id forman un grupo unido. */
    union_id?: string | null;
    zona?: MesaZonaRef | null;
    /** Pedido activo cargado desde el backend (máx. 1). */
    pedidos?: MesaPedidoActivo[];
};

export type SalonStats = {
    zonas: number;
    mesas: number;
    mesas_activas: number;
    capacidad: number;
};

export type SalonEstadoFilter = 'todos' | 'activas' | 'inactivas';

export type SalonFilters = {
    sede_id: string | null;
    zona_id: string | null;
    estado: SalonEstadoFilter;
};

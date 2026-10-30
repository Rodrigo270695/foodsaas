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

export type MesaSalon = {
    id: string;
    sede_id: string;
    zona_id: string;
    codigo: string;
    nombre: string | null;
    capacidad: number;
    activa: boolean;
    zona?: MesaZonaRef | null;
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

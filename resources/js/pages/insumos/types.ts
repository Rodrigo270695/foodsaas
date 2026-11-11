export type InsumoRow = {
    id: string;
    nombre: string;
    unidad: string;
    stock: string;
    stock_minimo: string | null;
    costo_unitario: string;
    activo: boolean;
    bajo: boolean;
};

export type InsumoFilters = {
    search: string;
    estado: 'activos' | 'inactivos' | 'todos';
    alerta: 'todos' | 'bajo' | 'ok';
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
};

export type InsumoStats = {
    total: number;
    activos: number;
    bajo: number;
    filtros: number;
    coincidencias: number;
};

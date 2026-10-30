export type CategoriaCarta = {
    id: string;
    nombre: string;
    descripcion: string | null;
    orden: number;
    activa: boolean;
    productos_count?: number;
};

export type AreaCarta = {
    id: string;
    nombre: string;
    orden: number;
    activa: boolean;
    productos_count?: number;
};

export type ProductoCategoriaRef = {
    id: string;
    nombre: string;
};

export type ProductoAreaRef = {
    id: string;
    nombre: string;
};

export type ProductoCarta = {
    id: string;
    categoria_id: string;
    area_id: string | null;
    nombre: string;
    descripcion: string | null;
    codigo: string | null;
    precio: string;
    orden: number;
    activo: boolean;
    imagen_path?: string | null;
    imagen_url?: string | null;
    categoria?: ProductoCategoriaRef | null;
    area?: ProductoAreaRef | null;
};

export type CartaStats = {
    productos: number;
    productos_activos: number;
    categorias: number;
    areas: number;
    coincidencias: number;
};

export type CartaEstadoFilter = 'todos' | 'activos' | 'inactivos';

export type CartaFilters = {
    search: string;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    categoria_id: string | null;
    area_id: string | null;
    estado: CartaEstadoFilter;
};

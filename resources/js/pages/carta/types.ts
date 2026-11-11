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

export type ControlInventario = 'none' | 'sku' | 'recipe';

export type InsumoOption = {
    id: string;
    nombre: string;
    unidad: string;
};

export type RecetaLineaForm = {
    insumo_id: string;
    cantidad: string;
};

export type ProductoRecetaLinea = {
    id: string;
    insumo_id: string;
    cantidad: string;
    insumo?: InsumoOption | null;
};

export type ProductoReceta = {
    id: string;
    notas: string | null;
    lineas?: ProductoRecetaLinea[];
};

export type ProductoCarta = {
    id: string;
    categoria_id: string;
    area_id: string | null;
    nombre: string;
    descripcion: string | null;
    codigo: string | null;
    codigo_barras: string | null;
    precio: string;
    orden: number;
    activo: boolean;
    control_inventario: ControlInventario;
    stock: string | null;
    stock_minimo: string | null;
    imagen_path?: string | null;
    imagen_url?: string | null;
    categoria?: ProductoCategoriaRef | null;
    area?: ProductoAreaRef | null;
    receta?: ProductoReceta | null;
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

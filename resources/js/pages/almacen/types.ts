export type AlmacenProducto = {
    id: string;
    nombre: string;
    codigo: string | null;
    control_inventario: 'sku' | 'recipe' | 'none';
    stock: string | null;
    stock_minimo: string | null;
    activo: boolean;
    categoria?: { id: string; nombre: string } | null;
};

export type MovimientoInventario = {
    id: string;
    tipo: string;
    cantidad: string;
    stock_anterior: string;
    stock_despues: string;
    motivo: string | null;
    created_at: string;
    user?: { id: string; name: string } | null;
};

export type AlmacenFilters = {
    search: string;
    per_page: number;
    control: 'sku' | 'recipe' | 'todos';
    alerta: 'todos' | 'bajo' | 'ok';
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
};

export type AlmacenStats = {
    sku: number;
    bajo: number;
    recipe: number;
    coincidencias: number;
};

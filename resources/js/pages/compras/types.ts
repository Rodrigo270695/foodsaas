export type CompraEstado =
    | 'borrador'
    | 'enviada'
    | 'parcial'
    | 'recibida'
    | 'anulada';

export type CompraListRow = {
    id: string;
    numero: number;
    estado: CompraEstado;
    fecha: string;
    total: string;
    lineas_count: number;
    proveedor: { id: string; nombre: string } | null;
};

export type CompraLineaRow = {
    id?: string;
    linea_tipo: 'insumo' | 'producto';
    insumo_id: string | null;
    producto_id: string | null;
    cantidad: string;
    cantidad_recibida?: string;
    pendiente?: number;
    costo_unitario: string;
    unidad: string;
    nombre?: string;
};

export type CompraDetail = {
    id: string;
    numero: number;
    estado: CompraEstado;
    fecha: string;
    notas: string | null;
    total: string;
    proveedor_id: string | null;
    proveedor: { id: string; nombre: string; ruc: string | null } | null;
    can_emitir: boolean;
    can_recibir: boolean;
    can_anular: boolean;
    can_edit: boolean;
    lineas: CompraLineaRow[];
};

export type CompraCatalog = {
    proveedores: { id: string; nombre: string; ruc: string | null }[];
    insumos: {
        id: string;
        nombre: string;
        unidad: string;
        costo_unitario: string;
    }[];
    productos: {
        id: string;
        nombre: string;
        costo_unitario: string;
        stock: string | null;
    }[];
};

export type CompraFilters = {
    search: string;
    estado: 'todos' | CompraEstado;
    per_page: number;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
};

export type ProveedorRow = {
    id: string;
    nombre: string;
    ruc: string | null;
    telefono: string | null;
    email: string | null;
    notas: string | null;
    activo: boolean;
};

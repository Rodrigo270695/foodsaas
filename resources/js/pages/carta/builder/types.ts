export type FondoPreset = 'cream' | 'ink' | 'brand' | 'paper' | 'sunset';

export type BuilderProducto = {
    id: string;
    categoria_id: string;
    nombre: string;
    descripcion: string | null;
    precio: string;
    imagen_path?: string | null;
    imagen_url?: string | null;
    activo: boolean;
    categoria?: { id: string; nombre: string } | null;
};

export type BuilderItem = {
    id: string;
    carta_id: string;
    producto_id: string;
    pagina: number;
    orden: number;
    notas: string | null;
    producto?: BuilderProducto | null;
};

export type MenuCartaRow = {
    id: string;
    nombre: string;
    slug: string;
    descripcion: string | null;
    fondo_preset: FondoPreset;
    paginas: number;
    publicada: boolean;
    vigente_desde: string | null;
    vigente_hasta: string | null;
    items_count?: number;
    updated_at?: string;
};

export type MenuCartaDetail = MenuCartaRow & {
    items: BuilderItem[];
};

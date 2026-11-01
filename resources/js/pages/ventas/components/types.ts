export type Producto = {
    id: string;
    nombre: string;
    codigo: string | null;
    codigo_barras?: string | null;
    precio: string | number;
    imagen_url?: string | null;
    categoria?: { id: string; nombre: string } | null;
};

/** Match exacto por código de barras o código interno (pistoleo). */
export function findProductoByScan(
    productos: readonly Producto[],
    raw: string,
): Producto | null {
    const q = raw.trim().toLowerCase();
    if (q.length < 1) {
        return null;
    }

    const byBarras = productos.find(
        (p) => (p.codigo_barras ?? '').trim().toLowerCase() === q,
    );
    if (byBarras) {
        return byBarras;
    }

    return (
        productos.find((p) => (p.codigo ?? '').trim().toLowerCase() === q) ??
        null
    );
}

export type PedidoLinea = {
    id: string;
    producto_id: string | null;
    nombre: string;
    precio_unitario: string | number;
    cantidad: string | number;
    importe: string | number;
    estado: string;
};

export type PedidoPendiente = {
    id: string;
    numero: number;
    canal: string;
    total: string | number;
    subtotal: string | number;
    descuento: string | number;
    mesa?: { id: string; codigo: string; nombre: string | null } | null;
    openedBy?: { id: number; name: string } | null;
    opened_by?: { id: number; name: string } | null;
    lineas: PedidoLinea[];
};

export type CartLine = {
    key: string;
    producto_id: string | null;
    nombre: string;
    precio: number;
    cantidad: number;
    locked?: boolean;
};

export function money(value: number): string {
    return `S/ ${value.toFixed(2)}`;
}

export function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

export const DENOMINACIONES = [10, 20, 50, 100, 200] as const;

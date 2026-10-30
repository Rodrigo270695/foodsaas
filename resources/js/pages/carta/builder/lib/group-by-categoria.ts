import type { BuilderProducto } from '../types';

export type CatalogCategoryGroup = {
    id: string;
    nombre: string;
    productos: BuilderProducto[];
};

/**
 * Agrupa productos del catálogo por categoría (orden de primera aparición).
 */
export function groupProductosByCategoria(
    productos: readonly BuilderProducto[],
): CatalogCategoryGroup[] {
    const map = new Map<string, CatalogCategoryGroup>();

    for (const producto of productos) {
        const id = producto.categoria?.id ?? producto.categoria_id ?? '__none__';
        const nombre = producto.categoria?.nombre?.trim() || 'Sin categoría';
        const existing = map.get(id);
        if (existing) {
            existing.productos.push(producto);
        } else {
            map.set(id, { id, nombre, productos: [producto] });
        }
    }

    return Array.from(map.values());
}

export type CanvasSectionRow<T> =
    | { kind: 'heading'; key: string; label: string }
    | { kind: 'item'; key: string; index: number; entry: T };

type WithProducto = {
    producto: BuilderProducto | null | undefined;
};

/**
 * Inserta títulos de categoría cuando cambia el grupo consecutivo.
 * Respeta el orden actual del canvas (reordenar sigue siendo libre).
 */
export function withCategoriaHeadings<T extends WithProducto>(
    items: readonly T[],
): CanvasSectionRow<T>[] {
    const rows: CanvasSectionRow<T>[] = [];
    let lastCat: string | null = null;

    items.forEach((entry, index) => {
        const catId =
            entry.producto?.categoria?.id ??
            entry.producto?.categoria_id ??
            '__none__';
        const label =
            entry.producto?.categoria?.nombre?.trim() || 'Sin categoría';

        if (catId !== lastCat) {
            rows.push({
                kind: 'heading',
                key: `h-${catId}-${index}`,
                label,
            });
            lastCat = catId;
        }

        rows.push({
            kind: 'item',
            key: entry.producto?.id ?? `i-${index}`,
            index,
            entry,
        });
    });

    return rows;
}

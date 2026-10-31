import { Search, UtensilsCrossed } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollableEntityFilters } from '@/components/data-page';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type PickerProducto = {
    id: string;
    nombre: string;
    precio: string | number;
    categoria_id: string;
    stock: string | number | null;
    control_inventario: string;
    imagen_url?: string | null;
};

export type PickerCategoria = {
    id: string;
    nombre: string;
};

type ProductoPickerProps = {
    productos: PickerProducto[];
    categorias: PickerCategoria[];
    disabled?: boolean;
    onAdd: (productoId: string) => void;
};

type ProductoGroup = {
    id: string;
    nombre: string;
    productos: PickerProducto[];
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

function ProductTile({
    producto,
    disabled,
    onAdd,
}: {
    producto: PickerProducto;
    disabled?: boolean;
    onAdd: () => void;
}) {
    const sinStock =
        producto.control_inventario === 'sku' &&
        Number(producto.stock ?? 0) <= 0;

    return (
        <button
            type="button"
            disabled={disabled || sinStock}
            onClick={onAdd}
            aria-label={`${producto.nombre}, ${money(producto.precio)}`}
            className={cn(
                'group flex h-full w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-border/70 bg-card text-left',
                'shadow-sm transition-[border-color,box-shadow,transform,opacity] duration-150 ease-out touch-manipulation',
                'hover:border-brand-600/50 hover:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/45 focus-visible:ring-offset-2',
                'active:scale-[0.98]',
                (disabled || sinStock) &&
                    'pointer-events-none cursor-not-allowed opacity-50 grayscale',
            )}
        >
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted/50">
                {producto.imagen_url ? (
                    <img
                        src={producto.imagen_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                    />
                ) : (
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-50 via-muted/40 to-muted/70 dark:from-brand-950/40 dark:via-muted/20 dark:to-muted/40"
                        aria-hidden
                    >
                        <UtensilsCrossed className="size-8 text-brand-600/35 stroke-[1.5]" />
                    </div>
                )}

                {/* Precio siempre legible sobre la imagen */}
                <span className="absolute right-2 bottom-2 rounded-md bg-background/95 px-2 py-1 text-sm font-semibold tabular-nums tracking-tight text-brand-700 shadow-sm ring-1 ring-border/60 backdrop-blur-sm dark:bg-card/95 dark:text-brand-400">
                    {money(producto.precio)}
                </span>

                {sinStock ? (
                    <span className="absolute top-2 left-2 rounded-md bg-foreground/85 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-background uppercase">
                        Sin stock
                    </span>
                ) : null}
            </div>

            <div className="flex min-h-[3.25rem] items-start px-3 py-2.5">
                <span className="line-clamp-2 text-[0.9375rem] leading-snug font-medium text-foreground">
                    {producto.nombre}
                </span>
            </div>
        </button>
    );
}

function ProductGrid({
    productos,
    disabled,
    onAdd,
}: {
    productos: PickerProducto[];
    disabled?: boolean;
    onAdd: (productoId: string) => void;
}) {
    return (
        <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
            role="list"
        >
            {productos.map((p) => (
                <div key={p.id} role="listitem" className="min-h-0 min-w-0">
                    <ProductTile
                        producto={p}
                        disabled={disabled}
                        onAdd={() => onAdd(p.id)}
                    />
                </div>
            ))}
        </div>
    );
}

export function ProductoPicker({
    productos,
    categorias,
    disabled,
    onAdd,
}: ProductoPickerProps) {
    const { t } = useTranslation(['pedidos', 'common']);
    const [search, setSearch] = useState('');
    const [categoriaId, setCategoriaId] = useState<string | null>(null);

    const countsByCategoria = useMemo(() => {
        const map = new Map<string, number>();
        for (const p of productos) {
            map.set(p.categoria_id, (map.get(p.categoria_id) ?? 0) + 1);
        }
        return map;
    }, [productos]);

    const categoryItems = useMemo(
        () =>
            categorias.map((c) => ({
                id: c.id,
                label: c.nombre,
                count: countsByCategoria.get(c.id) ?? 0,
            })),
        [categorias, countsByCategoria],
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return productos.filter((p) => {
            if (categoriaId && p.categoria_id !== categoriaId) {
                return false;
            }
            if (!q) {
                return true;
            }
            return p.nombre.toLowerCase().includes(q);
        });
    }, [productos, search, categoriaId]);

    const groups = useMemo<ProductoGroup[]>(() => {
        // Solo agrupar cuando está en "Todas"
        if (categoriaId) {
            return [];
        }

        const byId = new Map<string, PickerProducto[]>();
        for (const p of filtered) {
            const list = byId.get(p.categoria_id) ?? [];
            list.push(p);
            byId.set(p.categoria_id, list);
        }

        const ordered: ProductoGroup[] = [];
        for (const c of categorias) {
            const items = byId.get(c.id);
            if (items?.length) {
                ordered.push({ id: c.id, nombre: c.nombre, productos: items });
                byId.delete(c.id);
            }
        }

        // Productos sin categoría conocida
        for (const [id, items] of byId) {
            if (items.length) {
                ordered.push({
                    id,
                    nombre: t('form.sin_categoria', {
                        defaultValue: 'Sin categoría',
                    }),
                    productos: items,
                });
            }
        }

        return ordered;
    }, [filtered, categorias, categoriaId, t]);

    const showGrouped = !categoriaId && groups.length > 0;

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('form.buscar_producto')}
                    className="h-11 pl-9"
                    aria-label={t('form.buscar_producto')}
                />
            </div>

            <ScrollableEntityFilters
                aria-label={t('form.categorias', {
                    defaultValue: 'Categorías',
                })}
                items={categoryItems}
                value={categoriaId}
                allLabel={t('form.todas_categorias', {
                    defaultValue: 'Todas',
                })}
                allCount={productos.length}
                onChange={setCategoriaId}
                searchPlaceholder={t('form.buscar_categoria', {
                    defaultValue: 'Buscar categoría…',
                })}
                browseLabel={t('form.ver_categorias', {
                    defaultValue: 'Ver todas',
                })}
            />

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
                    <UtensilsCrossed className="size-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">
                        {t('form.sin_productos', {
                            defaultValue: 'Sin productos',
                        })}
                    </p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                        {t('form.sin_productos_hint', {
                            defaultValue:
                                'Prueba otra categoría o limpia la búsqueda.',
                        })}
                    </p>
                </div>
            ) : (
                <div
                    className="max-h-[min(36rem,calc(100dvh-16rem))] space-y-5 overflow-y-auto overscroll-contain pr-0.5"
                    aria-label={t('form.carta', {
                        defaultValue: 'Carta',
                    })}
                >
                    {showGrouped ? (
                        groups.map((group) => (
                            <section
                                key={group.id}
                                aria-labelledby={`cat-${group.id}`}
                                className="space-y-3"
                            >
                                <div className="sticky top-0 z-10 -mx-0.5 flex items-center gap-3 bg-background/95 px-0.5 py-1.5 backdrop-blur-sm">
                                    <h3
                                        id={`cat-${group.id}`}
                                        className="shrink-0 text-xs font-semibold tracking-[0.08em] text-brand-700 uppercase dark:text-brand-400"
                                    >
                                        {group.nombre}
                                    </h3>
                                    <div
                                        className="h-px min-w-4 flex-1 bg-border/80"
                                        aria-hidden
                                    />
                                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                                        {group.productos.length}
                                    </span>
                                </div>
                                <ProductGrid
                                    productos={group.productos}
                                    disabled={disabled}
                                    onAdd={onAdd}
                                />
                            </section>
                        ))
                    ) : (
                        <ProductGrid
                            productos={filtered}
                            disabled={disabled}
                            onAdd={onAdd}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

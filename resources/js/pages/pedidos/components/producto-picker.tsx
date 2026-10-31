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
            className={cn(
                'group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-left shadow-sm transition-all duration-150 touch-manipulation',
                'hover:-translate-y-0.5 hover:border-brand-600/40 hover:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
                'active:translate-y-0 active:scale-[0.98]',
                (disabled || sinStock) &&
                    'pointer-events-none opacity-55 grayscale',
            )}
        >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-50/80 dark:bg-brand-950/40">
                {producto.imagen_url ? (
                    <img
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div
                        className="flex size-full items-center justify-center text-brand-600/35"
                        aria-hidden
                    >
                        <UtensilsCrossed className="size-10 stroke-[1.5]" />
                    </div>
                )}
                {sinStock ? (
                    <span className="absolute top-2 left-2 rounded-md bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-background uppercase">
                        Sin stock
                    </span>
                ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
                <span className="line-clamp-2 text-sm leading-snug font-medium text-foreground">
                    {producto.nombre}
                </span>
                <span className="mt-auto text-base font-semibold tabular-nums text-brand-600">
                    {money(producto.precio)}
                </span>
            </div>
        </button>
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
                    className="grid max-h-[min(34rem,calc(100dvh-18rem))] grid-cols-2 gap-3 overflow-y-auto overscroll-contain pr-0.5 sm:grid-cols-3 xl:grid-cols-4"
                    role="list"
                    aria-label={t('form.carta', {
                        defaultValue: 'Carta',
                    })}
                >
                    {filtered.map((p) => (
                        <div key={p.id} role="listitem">
                            <ProductTile
                                producto={p}
                                disabled={disabled}
                                onAdd={() => onAdd(p.id)}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

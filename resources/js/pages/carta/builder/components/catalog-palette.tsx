import { GripVertical, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatPrecio } from '../../lib/format-precio';
import { groupProductosByCategoria } from '../lib/group-by-categoria';
import type { BuilderProducto } from '../types';

type CatalogPaletteProps = {
    productos: BuilderProducto[];
    usedIds: ReadonlySet<string>;
    onAdd: (productoId: string) => void;
};

export function CatalogPalette({
    productos,
    usedIds,
    onAdd,
}: CatalogPaletteProps) {
    const { t } = useTranslation('carta');
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) {
            return productos;
        }

        return productos.filter(
            (p) =>
                p.nombre.toLowerCase().includes(q) ||
                (p.categoria?.nombre ?? '').toLowerCase().includes(q),
        );
    }, [productos, query]);

    const groups = useMemo(
        () => groupProductosByCategoria(filtered),
        [filtered],
    );

    return (
        <aside className="flex h-full min-h-0 flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm">
            <div>
                <h2 className="text-sm font-semibold text-foreground">
                    {t('builder.catalog_title')}
                </h2>
                <p className="text-xs text-muted-foreground">
                    {t('builder.catalog_hint')}
                </p>
            </div>

            <div className="relative">
                <Search
                    className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                />
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('builder.catalog_search')}
                    className="h-9 pl-8"
                />
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5">
                {groups.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                        {t('builder.catalog_empty', {
                            defaultValue: 'Sin productos para mostrar.',
                        })}
                    </p>
                ) : (
                    groups.map((group) => (
                        <section key={group.id} className="space-y-1.5">
                            <header className="sticky top-0 z-[1] -mx-0.5 flex items-center gap-2 bg-card/95 px-1 py-1 backdrop-blur-sm">
                                <h3 className="text-[11px] font-semibold tracking-[0.14em] text-brand-800 uppercase dark:text-brand-200">
                                    {group.nombre}
                                </h3>
                                <span className="h-px flex-1 bg-border/70" />
                                <span className="text-[10px] tabular-nums text-muted-foreground">
                                    {group.productos.length}
                                </span>
                            </header>
                            <ul className="space-y-1.5">
                                {group.productos.map((producto) => {
                                    const used = usedIds.has(producto.id);

                                    return (
                                        <li key={producto.id}>
                                            <button
                                                type="button"
                                                draggable={!used}
                                                disabled={used}
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData(
                                                        'text/producto-id',
                                                        producto.id,
                                                    );
                                                    e.dataTransfer.effectAllowed =
                                                        'copy';
                                                }}
                                                onClick={() => {
                                                    if (!used) {
                                                        onAdd(producto.id);
                                                    }
                                                }}
                                                className={cn(
                                                    'group flex w-full cursor-grab items-center gap-2 rounded-xl border border-transparent bg-background/70 px-2 py-2 text-left transition-all duration-200 active:cursor-grabbing',
                                                    used
                                                        ? 'cursor-not-allowed opacity-45'
                                                        : 'hover:-translate-y-0.5 hover:border-brand-400/40 hover:bg-brand-50/40 hover:shadow-sm dark:hover:bg-brand-950/30',
                                                )}
                                            >
                                                <GripVertical
                                                    className="size-3.5 shrink-0 text-muted-foreground/70"
                                                    aria-hidden
                                                />
                                                <div className="size-9 shrink-0 overflow-hidden rounded-lg bg-muted/50">
                                                    {producto.imagen_url ? (
                                                        <img
                                                            src={
                                                                producto.imagen_url
                                                            }
                                                            alt=""
                                                            className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                        />
                                                    ) : null}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {producto.nombre}
                                                    </p>
                                                    <p className="truncate text-[11px] tabular-nums text-muted-foreground">
                                                        {formatPrecio(
                                                            producto.precio,
                                                        )}
                                                    </p>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))
                )}
            </div>
        </aside>
    );
}

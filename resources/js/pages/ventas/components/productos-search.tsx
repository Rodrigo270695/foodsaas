import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { money, type Producto } from './types';

type Props = {
    query: string;
    onQueryChange: (value: string) => void;
    productos: Producto[];
    onAdd: (producto: Producto) => void;
};

export function ProductosSearch({
    query,
    onQueryChange,
    productos,
    onAdd,
}: Props) {
    const { t } = useTranslation('ventas');

    return (
        <section className="flex min-h-0 flex-col rounded-xl border bg-card/70 p-3">
            <div className="mb-2 flex items-center gap-2">
                <Search
                    className="size-3.5 text-muted-foreground"
                    aria-hidden
                />
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t('nueva.buscar')}
                </h2>
            </div>
            <Input
                value={query}
                placeholder={t('nueva.buscar_placeholder')}
                onChange={(e) => onQueryChange(e.target.value)}
                className="mb-2 h-9"
            />
            <div className="grid max-h-[min(28rem,52vh)] gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-1">
                {productos.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => onAdd(p)}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-transparent bg-background px-2.5 py-2 text-left transition-colors hover:border-brand-500/35 hover:bg-brand-50/40 focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:bg-brand-950/30"
                    >
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                                {p.nombre}
                            </span>
                            {p.codigo ? (
                                <span className="text-[11px] text-muted-foreground">
                                    {p.codigo}
                                </span>
                            ) : null}
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-700">
                            {money(Number(p.precio))}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
}

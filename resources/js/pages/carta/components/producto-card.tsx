import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ProductoCarta } from '../types';

type ProductoCardProps = {
    producto: ProductoCarta;
    priceLabel: string;
    canUpdate: boolean;
    canDelete: boolean;
    onEdit: (producto: ProductoCarta) => void;
    onDelete: (producto: ProductoCarta) => void;
};

export function ProductoCard({
    producto,
    priceLabel,
    canUpdate,
    canDelete,
    onEdit,
    onDelete,
}: ProductoCardProps) {
    const { t } = useTranslation(['carta', 'common']);
    const showActions = canUpdate || canDelete;

    return (
        <article
            className={cn(
                'group relative flex flex-col overflow-hidden rounded-2xl border bg-card/90 shadow-sm transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-ring/40',
                producto.activo
                    ? 'border-border/70 hover:border-brand-400/40'
                    : 'border-border/50 opacity-80',
            )}
        >
            <div
                className={cn(
                    'h-1.5 w-full',
                    producto.activo ? 'bg-brand-600' : 'bg-muted-foreground/30',
                )}
            />

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                            <span
                                className={cn(
                                    'inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                                    producto.activo
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-muted text-muted-foreground',
                                )}
                            >
                                {producto.activo
                                    ? t('row.active')
                                    : t('row.inactive')}
                            </span>
                            {producto.categoria?.nombre ? (
                                <span className="truncate text-[11px] font-medium text-brand-700/80 dark:text-brand-300/90">
                                    {producto.categoria.nombre}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    {showActions ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('row.actions_for_product', {
                                        name: producto.nombre,
                                    })}
                                    className="size-8 shrink-0 cursor-pointer"
                                >
                                    <MoreHorizontal
                                        className="size-4"
                                        strokeWidth={2.5}
                                    />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                {canUpdate ? (
                                    <DropdownMenuItem
                                        onSelect={() => onEdit(producto)}
                                        className="cursor-pointer gap-2"
                                    >
                                        <Pencil
                                            className="size-4"
                                            strokeWidth={2.25}
                                        />
                                        {t('common:actions.edit')}
                                    </DropdownMenuItem>
                                ) : null}
                                {canDelete ? (
                                    <DropdownMenuItem
                                        onSelect={() => onDelete(producto)}
                                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                    >
                                        <Trash2
                                            className="size-4"
                                            strokeWidth={2.25}
                                        />
                                        {t('common:actions.delete')}
                                    </DropdownMenuItem>
                                ) : null}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : null}
                </div>

                <button
                    type="button"
                    disabled={!canUpdate}
                    onClick={() => {
                        if (canUpdate) {
                            onEdit(producto);
                        }
                    }}
                    className={cn(
                        'flex flex-1 flex-col gap-2 rounded-lg text-left outline-none',
                        canUpdate
                            ? 'cursor-pointer'
                            : 'cursor-default',
                    )}
                >
                    <h3 className="text-base font-semibold leading-snug text-foreground">
                        {producto.nombre}
                    </h3>
                    {producto.codigo ? (
                        <p className="font-mono text-[11px] text-muted-foreground">
                            {producto.codigo}
                        </p>
                    ) : null}
                    {producto.descripcion ? (
                        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {producto.descripcion}
                        </p>
                    ) : null}

                    <div className="mt-auto border-t border-border/50 pt-3">
                        <p className="text-lg font-semibold tabular-nums tracking-tight text-brand-700 dark:text-brand-300">
                            {priceLabel}
                        </p>
                    </div>
                </button>
            </div>
        </article>
    );
}

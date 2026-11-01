import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { money, round2, type CartLine } from './types';

type Props = {
    cart: CartLine[];
    subtotal: number;
    locked: boolean;
    onSetQty: (key: string, cantidad: number) => void;
    className?: string;
};

export function CarritoPanel({
    cart,
    subtotal,
    locked,
    onSetQty,
    className,
}: Props) {
    const { t } = useTranslation('ventas');

    return (
        <section
            className={cn(
                'flex min-h-0 flex-col rounded-xl border bg-card/70 p-3',
                className,
            )}
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <ShoppingBag
                        className="size-3.5 text-muted-foreground"
                        aria-hidden
                    />
                    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {t('nueva.carrito')}
                    </h2>
                </div>
                {cart.length > 0 ? (
                    <span className="text-xs tabular-nums text-muted-foreground">
                        {cart.length} · {money(subtotal)}
                    </span>
                ) : null}
            </div>
            {cart.length === 0 ? (
                <EmptyState
                    icon={ShoppingBag}
                    title={t('empty.carrito')}
                    description={t('empty.carrito_hint')}
                />
            ) : (
                <ul className="divide-y overflow-y-auto rounded-lg border">
                    {cart.map((line) => (
                        <li
                            key={line.key}
                            className="flex items-center gap-2 px-2.5 py-2"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                    {line.nombre}
                                </p>
                                <p className="text-[11px] text-muted-foreground tabular-nums">
                                    {money(line.precio)}
                                </p>
                            </div>
                            {line.locked || locked ? (
                                <span className="w-8 text-center text-sm tabular-nums">
                                    {line.cantidad}
                                </span>
                            ) : (
                                <div className="flex items-center gap-0.5">
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="size-7 cursor-pointer"
                                        onClick={() =>
                                            onSetQty(
                                                line.key,
                                                line.cantidad - 1,
                                            )
                                        }
                                        aria-label={t('actions.quitar')}
                                    >
                                        <Minus className="size-3" />
                                    </Button>
                                    <span className="w-7 text-center text-sm tabular-nums">
                                        {line.cantidad}
                                    </span>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="size-7 cursor-pointer"
                                        onClick={() =>
                                            onSetQty(
                                                line.key,
                                                line.cantidad + 1,
                                            )
                                        }
                                        aria-label={t('actions.agregar')}
                                    >
                                        <Plus className="size-3" />
                                    </Button>
                                </div>
                            )}
                            <p className="w-[4.5rem] text-right text-sm font-semibold tabular-nums">
                                {money(round2(line.precio * line.cantidad))}
                            </p>
                            {!line.locked && !locked ? (
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="size-7 cursor-pointer text-destructive"
                                    onClick={() => onSetQty(line.key, 0)}
                                    aria-label={t('actions.quitar')}
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

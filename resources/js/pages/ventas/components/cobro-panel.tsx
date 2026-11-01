import { Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DENOMINACIONES, money, round2 } from './types';

type Props = {
    medios: string[];
    medio: string;
    onMedioChange: (medio: string) => void;
    descuento: string;
    onDescuentoChange: (value: string) => void;
    montoRecibido: string;
    onMontoRecibidoChange: (value: string) => void;
    subtotal: number;
    descuentoNum: number;
    total: number;
    vuelto: number;
    canSubmit: boolean;
    busy: boolean;
    cobrandoPedido: boolean;
    onSubmit: () => void;
};

export function CobroPanel({
    medios,
    medio,
    onMedioChange,
    descuento,
    onDescuentoChange,
    montoRecibido,
    onMontoRecibidoChange,
    subtotal,
    descuentoNum,
    total,
    vuelto,
    canSubmit,
    busy,
    cobrandoPedido,
    onSubmit,
}: Props) {
    const { t } = useTranslation(['ventas', 'caja']);

    const aplicarExacto = () => {
        onMontoRecibidoChange(total.toFixed(2));
    };

    const sumarDenom = (monto: number) => {
        const actual =
            montoRecibido.trim() === '' ? 0 : Number(montoRecibido) || 0;
        onMontoRecibidoChange(round2(actual + monto).toFixed(2));
    };

    return (
        <aside className="space-y-3 rounded-xl border bg-card/80 p-3 shadow-sm lg:sticky lg:top-16">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Wallet
                        className="size-3.5 text-muted-foreground"
                        aria-hidden
                    />
                    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {t('nueva.cobro')}
                    </h2>
                </div>
                {total > 0 ? (
                    <span className="text-sm font-semibold tabular-nums text-brand-700">
                        {money(total)}
                    </span>
                ) : null}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
                {medios.map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => onMedioChange(m)}
                        aria-pressed={medio === m}
                        className={cn(
                            'cursor-pointer rounded-md border px-2 py-2 text-center text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40',
                            medio === m
                                ? 'border-brand-600 bg-brand-600 text-white'
                                : 'bg-background hover:bg-muted/50',
                        )}
                    >
                        {t(`caja:medios.${m}`)}
                    </button>
                ))}
            </div>

            <div className="space-y-1">
                <Label htmlFor="descuento" className="text-xs">
                    {t('nueva.descuento')}
                </Label>
                <Input
                    id="descuento"
                    type="number"
                    min={0}
                    step="0.01"
                    value={descuento}
                    onChange={(e) => onDescuentoChange(e.target.value)}
                    className="h-9"
                />
            </div>

            <div className="space-y-2 rounded-lg border border-border/70 bg-background/80 p-2.5">
                <div className="flex items-center justify-between gap-2">
                    <Label
                        htmlFor="recibido"
                        className="text-xs font-medium text-foreground"
                    >
                        {t('nueva.monto_recibido')}
                    </Label>
                    <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="h-7 cursor-pointer px-2.5 text-xs"
                        onClick={aplicarExacto}
                        disabled={total <= 0}
                    >
                        {t('nueva.exacto')}
                    </Button>
                </div>
                <Input
                    id="recibido"
                    type="number"
                    min={0}
                    step="0.01"
                    value={montoRecibido}
                    placeholder={total > 0 ? total.toFixed(2) : '0.00'}
                    onChange={(e) => onMontoRecibidoChange(e.target.value)}
                    className="h-11 text-base font-semibold tabular-nums"
                />
                <div className="flex flex-wrap gap-1.5">
                    {DENOMINACIONES.map((d) => (
                        <button
                            key={d}
                            type="button"
                            onClick={() => sumarDenom(d)}
                            className="cursor-pointer rounded-full border border-emerald-500/40 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50 dark:bg-background dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                        >
                            S/{d}
                        </button>
                    ))}
                </div>
            </div>

            <dl className="space-y-1 border-t pt-2.5 text-sm">
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">
                        {t('nueva.subtotal')}
                    </dt>
                    <dd className="tabular-nums">{money(subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">
                        {t('nueva.descuento')}
                    </dt>
                    <dd className="tabular-nums">−{money(descuentoNum)}</dd>
                </div>
                {vuelto > 0 ? (
                    <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-300">
                        <dt>{t('nueva.vuelto')}</dt>
                        <dd className="tabular-nums">{money(vuelto)}</dd>
                    </div>
                ) : null}
                <div className="flex justify-between gap-3 pt-1 text-base font-semibold text-brand-700">
                    <dt>{t('nueva.total')}</dt>
                    <dd className="tabular-nums">{money(total)}</dd>
                </div>
            </dl>

            <Button
                type="button"
                size="lg"
                className="h-11 w-full cursor-pointer gap-2"
                disabled={!canSubmit || busy}
                onClick={onSubmit}
            >
                <Wallet className="size-4" aria-hidden />
                {cobrandoPedido
                    ? t('nueva.cobrar_pedido')
                    : t('actions.registrar')}{' '}
                — {money(total)}
            </Button>
        </aside>
    );
}

import {
    Banknote,
    Building2,
    CreditCard,
    CircleDot,
    Smartphone,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DENOMINACIONES, money, round2 } from './types';

export type PagoPayload = {
    medio: string;
    monto: number;
};

type PagoLine = {
    medio: string;
    monto: string;
    monto_recibido: string;
};

type Props = {
    medios: string[];
    descuento: string;
    onDescuentoChange: (value: string) => void;
    subtotal: number;
    descuentoNum: number;
    total: number;
    /** Validaciones del padre (caja, carrito, cliente…). */
    extrasOk: boolean;
    busy: boolean;
    cobrandoPedido: boolean;
    onSubmit: (pagos: PagoPayload[]) => void;
};

const MEDIO_ICONS: Record<string, LucideIcon> = {
    efectivo: Banknote,
    yape: Smartphone,
    plin: Smartphone,
    tarjeta: CreditCard,
    transferencia: Building2,
    agora: Smartphone,
    sip: Smartphone,
    otro: CircleDot,
};

function parseMonto(value: string): number {
    return Number(String(value).replace(',', '.')) || 0;
}

/**
 * Panel de cobro estilo VetSaaS: métodos en cuadrados con icono,
 * billetes que fijan el monto (no suman) y dividir pago.
 */
export function CobroPanel({
    medios,
    descuento,
    onDescuentoChange,
    subtotal,
    descuentoNum,
    total,
    extrasOk,
    busy,
    cobrandoPedido,
    onSubmit,
}: Props) {
    const { t } = useTranslation(['ventas', 'caja']);
    const defaultMedio = medios[0] ?? 'efectivo';

    const [pagoMixtoModo, setPagoMixtoModo] = useState(false);
    const [pagos, setPagos] = useState<PagoLine[]>([
        { medio: defaultMedio, monto: '', monto_recibido: '' },
    ]);

    useEffect(() => {
        setPagos((prev) => {
            const valid = prev.filter((p) => medios.includes(p.medio));
            if (valid.length > 0) {
                return valid;
            }

            return [
                {
                    medio: medios[0] ?? 'efectivo',
                    monto: '',
                    monto_recibido: '',
                },
            ];
        });
    }, [medios]);

    const esMixto = pagoMixtoModo && pagos.length > 1;
    const esSoloEfectivo =
        !esMixto && pagos.length === 1 && pagos[0]?.medio === 'efectivo';

    const pagosSuma = useMemo(
        () => round2(pagos.reduce((acc, p) => acc + parseMonto(p.monto), 0)),
        [pagos],
    );
    const pagosCuadran = Math.abs(pagosSuma - total) < 0.015;

    const montoRecibido = esSoloEfectivo
        ? pagos[0]?.monto_recibido ?? ''
        : '';
    const recibidoNum =
        montoRecibido.trim() === '' ? total : parseMonto(montoRecibido);
    const vuelto =
        esSoloEfectivo && recibidoNum > total
            ? round2(recibidoNum - total)
            : 0;

    const toggleMetodoPago = useCallback(
        (metodo: string) => {
            setPagos((prev) => {
                if (!pagoMixtoModo) {
                    return [
                        { medio: metodo, monto: '', monto_recibido: '' },
                    ];
                }
                const exists = prev.some((p) => p.medio === metodo);
                let next = exists
                    ? prev.filter((p) => p.medio !== metodo)
                    : [
                          ...prev,
                          { medio: metodo, monto: '', monto_recibido: '' },
                      ];
                if (next.length === 0) {
                    next = [
                        {
                            medio: metodo,
                            monto: '',
                            monto_recibido: '',
                        },
                    ];
                }
                if (next.length === 1) {
                    next = [
                        {
                            ...next[0],
                            monto: '',
                            monto_recibido: '',
                        },
                    ];
                }

                return next;
            });
        },
        [pagoMixtoModo],
    );

    const setPagoField = useCallback(
        (medio: string, field: 'monto' | 'monto_recibido', value: string) => {
            setPagos((prev) =>
                prev.map((p) =>
                    p.medio === medio ? { ...p, [field]: value } : p,
                ),
            );
        },
        [],
    );

    const activarPagoMixto = () => {
        setPagoMixtoModo(true);
    };

    const salirPagoMixto = () => {
        setPagoMixtoModo(false);
        setPagos((prev) => {
            const first = prev[0] ?? {
                medio: defaultMedio,
                monto: '',
                monto_recibido: '',
            };

            return [
                {
                    medio: first.medio,
                    monto: '',
                    monto_recibido: '',
                },
            ];
        });
    };

    const aplicarExacto = () => {
        if (!esSoloEfectivo || !pagos[0]) {
            return;
        }
        setPagoField(pagos[0].medio, 'monto_recibido', total.toFixed(2));
    };

    const fijarDenom = (monto: number) => {
        if (!esSoloEfectivo || !pagos[0]) {
            return;
        }
        setPagoField(pagos[0].medio, 'monto_recibido', String(monto));
    };

    const buildPagosPayload = (): PagoPayload[] | null => {
        if (total <= 0) {
            return null;
        }

        if (esMixto) {
            const lines = pagos
                .map((p) => ({
                    medio: p.medio,
                    monto: round2(parseMonto(p.monto)),
                }))
                .filter((p) => p.monto > 0);
            if (lines.length < 2) {
                return null;
            }
            const suma = round2(lines.reduce((a, p) => a + p.monto, 0));
            if (Math.abs(suma - total) >= 0.015) {
                return null;
            }

            return lines;
        }

        const medio = pagos[0]?.medio ?? defaultMedio;
        if (medio === 'efectivo') {
            const recibido =
                montoRecibido.trim() === ''
                    ? total
                    : parseMonto(montoRecibido);
            if (recibido + 0.001 < total) {
                return null;
            }
        }

        return [{ medio, monto: total }];
    };

    const canPay = useMemo(() => {
        if (!extrasOk || busy || total <= 0) {
            return false;
        }
        if (esMixto) {
            return (
                pagos.length > 1 &&
                pagosCuadran &&
                pagos.every((p) => parseMonto(p.monto) > 0)
            );
        }
        if (esSoloEfectivo && montoRecibido.trim() !== '') {
            return parseMonto(montoRecibido) + 0.001 >= total;
        }

        return true;
    }, [
        extrasOk,
        busy,
        total,
        esMixto,
        pagos,
        pagosCuadran,
        esSoloEfectivo,
        montoRecibido,
    ]);

    const handleSubmit = () => {
        const payload = buildPagosPayload();
        if (!payload) {
            return;
        }
        onSubmit(payload);
    };

    const gridCols =
        medios.length <= 4
            ? 'grid-cols-4'
            : medios.length <= 5
              ? 'grid-cols-5'
              : 'grid-cols-4';

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

            <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                    {t('nueva.medio_pago')}
                </Label>
                <div className={cn('grid gap-1', gridCols)}>
                    {medios.map((m) => {
                        const Icon = MEDIO_ICONS[m] ?? CircleDot;
                        const activo = pagos.some((p) => p.medio === m);

                        return (
                            <button
                                key={m}
                                type="button"
                                onClick={() => toggleMetodoPago(m)}
                                aria-pressed={activo}
                                className={cn(
                                    'flex cursor-pointer flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-center transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40',
                                    activo
                                        ? 'border-brand-600 bg-brand-600/10 text-brand-800 dark:text-brand-100'
                                        : 'bg-background text-muted-foreground hover:bg-muted/50',
                                )}
                            >
                                <Icon className="size-3.5 shrink-0" aria-hidden />
                                <span className="w-full truncate text-[9px] font-medium leading-tight">
                                    {t(`caja:medios.${m}`)}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="pt-0.5">
                    {pagoMixtoModo ? (
                        <button
                            type="button"
                            onClick={salirPagoMixto}
                            className="cursor-pointer text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        >
                            {t('nueva.pago_un_solo_metodo')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={activarPagoMixto}
                            className="cursor-pointer text-[11px] font-medium text-brand-700 underline-offset-2 hover:underline"
                        >
                            {t('nueva.dividir_pago')}
                        </button>
                    )}
                </div>
                {pagoMixtoModo && !esMixto ? (
                    <p className="text-[10px] text-muted-foreground">
                        {t('nueva.pago_mixto_hint')}
                    </p>
                ) : null}
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

            {esMixto ? (
                <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/10 p-2.5">
                    {pagos.map((pago) => {
                        const restante = Math.max(
                            0,
                            round2(
                                total -
                                    pagos
                                        .filter((p) => p.medio !== pago.medio)
                                        .reduce(
                                            (a, p) => a + parseMonto(p.monto),
                                            0,
                                        ),
                            ),
                        );

                        return (
                            <div
                                key={pago.medio}
                                className="flex items-center gap-2"
                            >
                                <span className="w-[4.5rem] shrink-0 truncate text-[11px] font-medium">
                                    {t(`caja:medios.${pago.medio}`)}
                                </span>
                                <Input
                                    className="h-8 flex-1 text-sm tabular-nums"
                                    inputMode="decimal"
                                    placeholder={
                                        restante > 0
                                            ? restante.toFixed(2)
                                            : '0.00'
                                    }
                                    value={pago.monto}
                                    onChange={(e) =>
                                        setPagoField(
                                            pago.medio,
                                            'monto',
                                            e.target.value,
                                        )
                                    }
                                />
                                <button
                                    type="button"
                                    className="cursor-pointer rounded border border-border/60 px-1.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted"
                                    disabled={restante <= 0}
                                    onClick={() =>
                                        setPagoField(
                                            pago.medio,
                                            'monto',
                                            String(restante),
                                        )
                                    }
                                >
                                    {t('nueva.pago_restante')}
                                </button>
                            </div>
                        );
                    })}
                    <div
                        className={cn(
                            'flex justify-between gap-2 pt-1 text-[11px] font-medium tabular-nums',
                            pagosCuadran
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-amber-700 dark:text-amber-300',
                        )}
                    >
                        <span>
                            {t('nueva.pago_suma')} {money(pagosSuma)}
                        </span>
                        <span>/ {money(total)}</span>
                    </div>
                </div>
            ) : null}

            {esSoloEfectivo ? (
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
                        onChange={(e) =>
                            setPagoField(
                                'efectivo',
                                'monto_recibido',
                                e.target.value,
                            )
                        }
                        className="h-11 text-base font-semibold tabular-nums"
                    />
                    <div className="flex flex-wrap gap-1.5">
                        {DENOMINACIONES.map((d) => {
                            const suficiente = d >= total && total > 0;

                            return (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => fijarDenom(d)}
                                    className={cn(
                                        'cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                                        suficiente
                                            ? 'border-emerald-600/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            : 'border-border bg-white text-foreground hover:bg-muted/60 dark:bg-background',
                                    )}
                                >
                                    S/{d}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

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
                disabled={!canPay}
                onClick={handleSubmit}
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

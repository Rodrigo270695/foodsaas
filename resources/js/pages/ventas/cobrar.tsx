import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Check, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import caja from '../caja/caja-routes';
import ventas from './ventas-routes';

type Linea = {
    id: string;
    nombre: string;
    cantidad: string | number;
    precio_unitario: string | number;
    importe: string | number;
    estado: string;
};

type Pedido = {
    id: string;
    numero: number;
    estado: string;
    canal: string;
    subtotal: string | number;
    descuento: string | number;
    total: string | number;
    mesa?: { id: string; codigo: string; nombre: string | null } | null;
    openedBy?: { id: number; name: string } | null;
    opened_by?: { id: number; name: string } | null;
    lineas: Linea[];
};

type Props = {
    pedido: Pedido;
    sesion_abierta: boolean;
    medios: string[];
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

export default function Cobrar({ pedido, sesion_abierta, medios }: Props) {
    const { t } = useTranslation(['ventas', 'caja', 'common']);
    const [medio, setMedio] = useState(medios[0] ?? 'efectivo');
    const [descuento, setDescuento] = useState(String(pedido.descuento ?? 0));
    const [monto, setMonto] = useState('');
    const [busy, setBusy] = useState(false);

    const totalAPagar = useMemo(() => {
        const base = Number(pedido.subtotal) - (Number(descuento) || 0);
        return Math.max(0, round2(base));
    }, [pedido.subtotal, descuento]);

    const montoPago = monto === '' ? totalAPagar : Number(monto) || 0;

    function confirmar() {
        if (!sesion_abierta) {
            router.visit(caja.index().url);
            return;
        }
        setBusy(true);
        router.post(
            ventas.cobrar(pedido.id).url,
            {
                descuento: Number(descuento) || 0,
                pagos: [{ medio, monto: montoPago }],
            },
            { onFinish: () => setBusy(false) },
        );
    }

    const mesa =
        pedido.mesa?.nombre?.trim() || pedido.mesa?.codigo || t(`canal.${pedido.canal}`, {
            defaultValue: pedido.canal,
        });
    const mesero = pedido.openedBy?.name ?? pedido.opened_by?.name;

    return (
        <>
            <Head title={t('cobrar.title', { numero: pedido.numero })} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('cobrar.title', { numero: pedido.numero })}
                    description={[mesa, mesero ? `${t('columns.mesero')}: ${mesero}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    action={
                        <Button variant="outline" size="sm" asChild>
                            <Link href={ventas.index().url}>
                                <ArrowLeft className="size-4" />
                                {t('title')}
                            </Link>
                        </Button>
                    }
                />

                {!sesion_abierta ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
                        <strong>{t('caja_cerrada')}</strong>
                        {' — '}
                        {t('caja_cerrada_hint')}{' '}
                        <Link href={caja.index().url} className="font-medium underline">
                            {t('ir_caja')}
                        </Link>
                    </div>
                ) : null}

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <section className="space-y-3 rounded-2xl border bg-card/60 p-4">
                        <h2 className="text-base font-semibold">{t('cobrar.items')}</h2>
                        <ul className="divide-y">
                            {pedido.lineas.map((l) => (
                                <li
                                    key={l.id}
                                    className="flex items-start justify-between gap-3 py-2.5 text-sm"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {Number(l.cantidad)}× {l.nombre}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {t(`estado_linea.${l.estado}`, {
                                                defaultValue: l.estado,
                                            })}
                                        </p>
                                    </div>
                                    <span className="tabular-nums">{money(l.importe)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <aside className="space-y-4 rounded-2xl border bg-card/90 p-4 shadow-sm lg:sticky lg:top-24">
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('cobrar.subtotal')}</span>
                                <span className="tabular-nums">{money(pedido.subtotal)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-primary">
                                <span>{t('cobrar.total')}</span>
                                <span className="tabular-nums">{money(totalAPagar)}</span>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>{t('cobrar.descuento')}</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={descuento}
                                onChange={(e) => setDescuento(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('cobrar.medio')}</Label>
                            <Select value={medio} onValueChange={setMedio}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {medios.map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {t(`caja:medios.${m}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('cobrar.monto')}</Label>
                            <Input
                                type="number"
                                min={0.01}
                                step="0.01"
                                placeholder={String(totalAPagar.toFixed(2))}
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                            />
                        </div>

                        <Button
                            type="button"
                            className="w-full cursor-pointer gap-1.5"
                            disabled={busy || !sesion_abierta || montoPago <= 0}
                            onClick={confirmar}
                        >
                            <Check className="size-4" />
                            {t('cobrar.confirm')}
                            <Wallet className="size-4 opacity-70" />
                        </Button>
                    </aside>
                </div>
            </div>
        </>
    );
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

Cobrar.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Ventas', href: '/ventas' },
            { title: 'Cobrar' },
        ]}
    >
        {page}
    </AppLayout>
);

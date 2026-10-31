import { Head, Link, router } from '@inertiajs/react';
import {
    Banknote,
    CreditCard,
    Lock,
    Unlock,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PageHeader } from '@/components/data-page';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { formatPeruTime } from '@/lib/format-peru-datetime';
import pedidos from '../pedidos/pedidos-routes';
import caja from './caja-routes';

type Sesion = {
    id: string;
    estado: string;
    monto_apertura: string | number;
    opened_at: string;
    opened_by?: { id: number; name: string } | null;
};

type PedidoPendiente = {
    id: string;
    numero: number;
    canal: string;
    total: string | number;
    mesa?: { id: string; codigo: string; nombre: string | null } | null;
};

type VentaHoy = {
    id: string;
    total: string | number;
    created_at: string;
    pedido?: {
        id: string;
        numero: number;
        canal: string;
        mesa?: { id: string; codigo: string; nombre: string | null } | null;
    } | null;
    pagos: { medio: string; monto: string | number }[];
};

type Props = {
    sesion: Sesion | null;
    totales_sesion: {
        ventas: number;
        efectivo: number;
        tarjeta: number;
        otros: number;
        conteo: number;
    };
    ventas_hoy: VentaHoy[];
    pedidos_pendientes: PedidoPendiente[];
    medios: string[];
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

export default function Index({
    sesion,
    totales_sesion,
    ventas_hoy,
    pedidos_pendientes,
}: Props) {
    const { t } = useTranslation(['caja', 'pedidos', 'common']);
    const [abrirOpen, setAbrirOpen] = useState(false);
    const [cerrarOpen, setCerrarOpen] = useState(false);
    const [montoApertura, setMontoApertura] = useState('0');
    const [montoContado, setMontoContado] = useState('0');
    const [notas, setNotas] = useState('');
    const [busy, setBusy] = useState(false);

    function abrirCaja() {
        setBusy(true);
        router.post(
            caja.abrir().url,
            { monto_apertura: Number(montoApertura) || 0 },
            {
                onFinish: () => setBusy(false),
                onSuccess: () => setAbrirOpen(false),
            },
        );
    }

    function cerrarCaja() {
        setBusy(true);
        router.post(
            caja.cerrar().url,
            {
                monto_contado: Number(montoContado) || 0,
                notas: notas || null,
            },
            {
                onFinish: () => setBusy(false),
                onSuccess: () => setCerrarOpen(false),
            },
        );
    }

    return (
        <>
            <Head title={t('title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('description')}
                    stats={[
                        {
                            label: t('stats.ventas'),
                            value: money(totales_sesion.ventas),
                            variant: 'info',
                            icon: Wallet,
                        },
                        {
                            label: t('stats.efectivo'),
                            value: money(totales_sesion.efectivo),
                            variant: 'success',
                            icon: Banknote,
                        },
                        {
                            label: t('stats.tarjeta'),
                            value: money(totales_sesion.tarjeta),
                            variant: 'primary',
                            icon: CreditCard,
                        },
                        {
                            label: t('stats.conteo'),
                            value: totales_sesion.conteo,
                            variant: 'muted',
                        },
                    ]}
                    action={
                        sesion ? (
                            <Can permission="caja.cerrar">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() => {
                                        setMontoContado(
                                            String(
                                                (
                                                    Number(
                                                        sesion.monto_apertura,
                                                    ) +
                                                    totales_sesion.efectivo
                                                ).toFixed(2),
                                            ),
                                        );
                                        setCerrarOpen(true);
                                    }}
                                >
                                    <Lock className="size-4" />
                                    {t('sesion.cerrar')}
                                </Button>
                            </Can>
                        ) : (
                            <Can permission="caja.abrir">
                                <Button
                                    type="button"
                                    className="gap-1.5"
                                    onClick={() => setAbrirOpen(true)}
                                >
                                    <Unlock className="size-4" />
                                    {t('sesion.abrir')}
                                </Button>
                            </Can>
                        )
                    }
                />

                <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                        sesion
                            ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-900 dark:text-emerald-200'
                            : 'border-amber-500/30 bg-amber-500/8 text-amber-900 dark:text-amber-200'
                    }`}
                >
                    {sesion ? (
                        <>
                            <strong>{t('sesion.abierta')}</strong>
                            {' · '}
                            {t('sesion.apertura')}: {money(sesion.monto_apertura)}
                            {sesion.opened_by
                                ? ` · ${t('sesion.opened_by', { name: sesion.opened_by.name })}`
                                : null}
                        </>
                    ) : (
                        <strong>{t('sesion.cerrada')}</strong>
                    )}
                </div>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">
                        {t('sections.pendientes')}
                    </h2>
                    {pedidos_pendientes.length === 0 ? (
                        <EmptyState
                            icon={Wallet}
                            title={t('empty.pendientes')}
                        />
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {pedidos_pendientes.map((p) => (
                                <Link
                                    key={p.id}
                                    href={pedidos.show(p.id).url}
                                    className="rounded-xl border bg-card/80 p-4 transition hover:border-[#660033]/40 hover:shadow-sm"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-[#660033]">
                                            #{p.numero}
                                        </span>
                                        <span className="font-semibold tabular-nums">
                                            {money(p.total)}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {p.mesa
                                            ? p.mesa.nombre?.trim() ||
                                              p.mesa.codigo
                                            : t(`pedidos:canal.${p.canal}`)}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">
                        {t('sections.ventas_hoy')}
                    </h2>
                    {ventas_hoy.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {t('empty.ventas')}
                        </p>
                    ) : (
                        <ul className="divide-y rounded-xl border bg-card/60">
                            {ventas_hoy.map((v) => (
                                <li
                                    key={v.id}
                                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {v.pedido
                                                ? `#${v.pedido.numero}`
                                                : 'Venta'}
                                            {v.pedido?.mesa
                                                ? ` · ${v.pedido.mesa.nombre?.trim() || v.pedido.mesa.codigo}`
                                                : ''}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatPeruTime(v.created_at)}
                                            {' · '}
                                            {v.pagos
                                                .map((p) =>
                                                    t(`medios.${p.medio}`),
                                                )
                                                .join(', ')}
                                        </p>
                                    </div>
                                    <span className="font-semibold tabular-nums">
                                        {money(v.total)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <Dialog open={abrirOpen} onOpenChange={setAbrirOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('sesion.abrir')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-2 py-2">
                        <Label>{t('sesion.apertura')}</Label>
                        <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={montoApertura}
                            onChange={(e) => setMontoApertura(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAbrirOpen(false)}
                        >
                            {t('common:actions.cancel')}
                        </Button>
                        <Button
                            type="button"
                            disabled={busy}
                            onClick={abrirCaja}
                        >
                            {t('sesion.abrir')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={cerrarOpen} onOpenChange={setCerrarOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('sesion.cerrar')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            {t('sesion.sistema')}:{' '}
                            {money(
                                Number(sesion?.monto_apertura ?? 0) +
                                    totales_sesion.efectivo,
                            )}
                        </p>
                        <div className="grid gap-2">
                            <Label>{t('sesion.contado')}</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={montoContado}
                                onChange={(e) =>
                                    setMontoContado(e.target.value)
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('pedidos:form.notas')}</Label>
                            <Textarea
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCerrarOpen(false)}
                        >
                            {t('common:actions.cancel')}
                        </Button>
                        <Button
                            type="button"
                            disabled={busy}
                            onClick={cerrarCaja}
                        >
                            {t('sesion.cerrar')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Caja', href: '/caja' },
        ]}
    >
        {page}
    </AppLayout>
);

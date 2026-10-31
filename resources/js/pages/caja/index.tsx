import { Head, router } from '@inertiajs/react';
import {
    ArrowDownLeft,
    Banknote,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';
import { cn } from '@/lib/utils';
import caja from './caja-routes';
import { SesionAbrirModal } from './components/sesion-abrir-modal';

type Sesion = {
    id: string;
    estado: string;
    monto_apertura: string | number;
    monto_cierre_sistema?: string | number | null;
    monto_cierre_contado?: string | number | null;
    opened_at: string;
    closed_at?: string | null;
    opened_by?: { id: number; name: string } | null;
    closed_by?: { id: number; name: string } | null;
};

type Egreso = {
    id: string;
    monto: string | number;
    medio: string;
    motivo: string;
    notas: string | null;
    created_at: string;
    created_by?: { id: number; name: string } | null;
};

type Props = {
    sesion: Sesion | null;
    sesiones: Sesion[];
    egresos: Egreso[];
    totales_sesion: {
        ventas: number;
        efectivo: number;
        tarjeta: number;
        otros: number;
        egresos: number;
        conteo: number;
    };
    sistema_efectivo: number;
    motivos_egreso: string[];
    medios: string[];
    stats: { sesiones: number; abiertas: number; cerradas: number };
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

export default function Index({
    sesion,
    sesiones,
    egresos,
    totales_sesion,
    sistema_efectivo,
    motivos_egreso,
    medios,
}: Props) {
    const { t } = useTranslation(['caja', 'common']);
    const [abrirOpen, setAbrirOpen] = useState(false);
    const [cerrarOpen, setCerrarOpen] = useState(false);
    const [egresoOpen, setEgresoOpen] = useState(false);
    const [montoContado, setMontoContado] = useState('0');
    const [notas, setNotas] = useState('');
    const [egresoMonto, setEgresoMonto] = useState('');
    const [egresoMedio, setEgresoMedio] = useState('efectivo');
    const [egresoMotivo, setEgresoMotivo] = useState('insumos');
    const [egresoNotas, setEgresoNotas] = useState('');
    const [busy, setBusy] = useState(false);

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

    function registrarEgreso() {
        setBusy(true);
        router.post(
            caja.egresos.store().url,
            {
                monto: Number(egresoMonto) || 0,
                medio: egresoMedio,
                motivo: egresoMotivo,
                notas: egresoNotas || null,
            },
            {
                onFinish: () => setBusy(false),
                onSuccess: () => {
                    setEgresoOpen(false);
                    setEgresoMonto('');
                    setEgresoNotas('');
                },
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
                            variant: 'success',
                            icon: Wallet,
                        },
                        {
                            label: t('stats.apertura'),
                            value: money(sesion?.monto_apertura ?? 0),
                            variant: 'info',
                            icon: Banknote,
                        },
                        {
                            label: t('stats.efectivo'),
                            value: money(totales_sesion.efectivo),
                            variant: 'primary',
                            icon: Banknote,
                        },
                        {
                            label: t('stats.egresos'),
                            value: money(totales_sesion.egresos),
                            variant: 'danger',
                            icon: ArrowDownLeft,
                        },
                        {
                            label: t('stats.conteo'),
                            value: totales_sesion.conteo,
                            variant: 'muted',
                        },
                    ]}
                    action={
                        sesion ? (
                            <div className="flex flex-wrap gap-2">
                                <Can permission="caja.egreso">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="cursor-pointer gap-1.5 text-rose-700 dark:text-rose-300"
                                        onClick={() => setEgresoOpen(true)}
                                    >
                                        <ArrowDownLeft className="size-4" />
                                        {t('egreso.registrar')}
                                    </Button>
                                </Can>
                                <Can permission="caja.cerrar">
                                    <Button
                                        type="button"
                                        className="cursor-pointer gap-1.5"
                                        onClick={() => {
                                            setMontoContado(
                                                String(sistema_efectivo.toFixed(2)),
                                            );
                                            setCerrarOpen(true);
                                        }}
                                    >
                                        <Lock className="size-4" />
                                        {t('sesion.cerrar')}
                                    </Button>
                                </Can>
                            </div>
                        ) : (
                            <Can permission="caja.abrir">
                                <Button
                                    type="button"
                                    className="cursor-pointer gap-1.5"
                                    onClick={() => setAbrirOpen(true)}
                                >
                                    <Unlock className="size-4" />
                                    {t('sesion.abrir')}
                                </Button>
                            </Can>
                        )
                    }
                />

                {sesion ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1 text-sm text-emerald-950 dark:text-emerald-100">
                            <p className="font-semibold">{t('sesion.tu_abierta')}</p>
                            <p className="text-emerald-900/80 dark:text-emerald-200/90">
                                {t('sesion.abierta_hint')}
                                {' · '}
                                {t('sesion.apertura')}: {money(sesion.monto_apertura)}
                                {sesion.opened_by
                                    ? ` · ${t('sesion.opened_by', { name: sesion.opened_by.name })}`
                                    : null}
                            </p>
                        </div>
                        <Can permission="caja.cerrar">
                            <Button
                                type="button"
                                size="sm"
                                className="cursor-pointer gap-1.5"
                                onClick={() => {
                                    setMontoContado(String(sistema_efectivo.toFixed(2)));
                                    setCerrarOpen(true);
                                }}
                            >
                                {t('sesion.ir_cerrar')}
                            </Button>
                        </Can>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
                        <strong>{t('sesion.cerrada')}</strong>
                        {' — '}
                        {t('sesion.cerrada_hint')}
                    </div>
                )}

                {sesion ? (
                    <section className="space-y-3">
                        <h2 className="text-base font-semibold">{t('sections.egresos')}</h2>
                        {egresos.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('empty.egresos')}
                            </p>
                        ) : (
                            <ul className="divide-y rounded-xl border bg-card/60">
                                {egresos.map((e) => (
                                    <li
                                        key={e.id}
                                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {t(`egreso.motivos.${e.motivo}`)}
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    {t(`medios.${e.medio}`)}
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatPeruDateTime(e.created_at).fecha}{' '}
                                                {formatPeruDateTime(e.created_at).hora}
                                                {e.created_by
                                                    ? ` · ${e.created_by.name}`
                                                    : ''}
                                                {e.notas ? ` · ${e.notas}` : ''}
                                            </p>
                                        </div>
                                        <span className="font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                                            −{money(e.monto)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                ) : null}

                <section className="space-y-3">
                    <h2 className="text-base font-semibold">{t('sections.sesiones')}</h2>
                    {sesiones.length === 0 ? (
                        <EmptyState
                            icon={Wallet}
                            title={t('empty.sesiones')}
                            description={t('empty.sesiones_hint')}
                        />
                    ) : (
                        <div className="overflow-x-auto rounded-xl border bg-card/60">
                            <table className="w-full min-w-[40rem] text-left text-sm">
                                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">{t('columns.estado')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.apertura')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.cierre')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.saldo_apertura')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.efectivo_cierre')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.abierta_por')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {sesiones.map((s) => {
                                        const abierta = s.estado === 'abierta';
                                        const ap = formatPeruDateTime(s.opened_at);
                                        const ci = s.closed_at
                                            ? formatPeruDateTime(s.closed_at)
                                            : null;

                                        return (
                                            <tr key={s.id} className="hover:bg-muted/30">
                                                <td className="px-3 py-2.5">
                                                    <span
                                                        className={cn(
                                                            'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                                                            abierta
                                                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                                                : 'bg-muted text-muted-foreground',
                                                        )}
                                                    >
                                                        {abierta
                                                            ? t('sesion.estado_abierta')
                                                            : t('sesion.estado_cerrada')}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 tabular-nums">
                                                    <div>{ap.fecha}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {ap.hora}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                                                    {ci ? (
                                                        <>
                                                            <div>{ci.fecha}</div>
                                                            <div className="text-xs">{ci.hora}</div>
                                                        </>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 tabular-nums">
                                                    {money(s.monto_apertura)}
                                                </td>
                                                <td className="px-3 py-2.5 tabular-nums">
                                                    {s.monto_cierre_contado != null
                                                        ? money(s.monto_cierre_contado)
                                                        : '—'}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    {s.opened_by?.name ?? '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            <SesionAbrirModal open={abrirOpen} onOpenChange={setAbrirOpen} />

            <Dialog open={cerrarOpen} onOpenChange={setCerrarOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('sesion.cerrar')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            {t('sesion.sistema')}: {money(sistema_efectivo)}
                        </p>
                        <div className="grid gap-2">
                            <Label>{t('sesion.contado')}</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={montoContado}
                                onChange={(e) => setMontoContado(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('sesion.notas')}</Label>
                            <Textarea
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCerrarOpen(false)}>
                            {t('common:actions.cancel')}
                        </Button>
                        <Button type="button" disabled={busy} onClick={cerrarCaja}>
                            {t('sesion.cerrar')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={egresoOpen} onOpenChange={setEgresoOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('egreso.registrar')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t('egreso.monto')}</Label>
                            <Input
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={egresoMonto}
                                onChange={(e) => setEgresoMonto(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('egreso.motivo')}</Label>
                            <Select value={egresoMotivo} onValueChange={setEgresoMotivo}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {motivos_egreso.map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {t(`egreso.motivos.${m}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('egreso.medio')}</Label>
                            <Select value={egresoMedio} onValueChange={setEgresoMedio}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {medios.map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {t(`medios.${m}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('sesion.notas')}</Label>
                            <Textarea
                                value={egresoNotas}
                                onChange={(e) => setEgresoNotas(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEgresoOpen(false)}>
                            {t('common:actions.cancel')}
                        </Button>
                        <Button type="button" disabled={busy} onClick={registrarEgreso}>
                            {t('egreso.guardar')}
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

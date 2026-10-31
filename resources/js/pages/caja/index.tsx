import { Head } from '@inertiajs/react';
import {
    ArrowDownLeft,
    Banknote,
    Eye,
    Lock,
    Printer,
    RotateCcw,
    Unlock,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import {
    DataTable,
    EmptyState,
    PageHeader,
    StatBadge,
} from '@/components/data-page';
import type { DataTableColumn } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';
import caja from './caja-routes';
import { ArqueoPrintDialog } from './components/arqueo-print-dialog';
import { SesionAbrirModal } from './components/sesion-abrir-modal';
import { SesionArqueoDetalleModal } from './components/sesion-arqueo-detalle-modal';
import { SesionCerrarModal } from './components/sesion-cerrar-modal';
import { SesionEgresoModal } from './components/sesion-egreso-modal';
import { SesionReabrirDialog } from './components/sesion-reabrir-dialog';

type Usuario = { id: number; name: string };
type SedeInfo = { id: string; nombre: string; codigo: string };

type Sesion = {
    id: string;
    estado: string;
    moneda: string;
    monto_apertura: string | number;
    monto_cierre_sistema?: string | number | null;
    monto_cierre_contado?: string | number | null;
    opened_at: string;
    closed_at?: string | null;
    opened_by?: Usuario | null;
    closed_by?: Usuario | null;
    sede?: SedeInfo | null;
    puede_reabrir?: boolean;
};

type Egreso = {
    id: string;
    monto: string | number;
    medio: string;
    motivo: string;
    notas: string | null;
    created_at: string;
    created_by?: Usuario | null;
};

type Props = {
    /** Tu sesión abierta en la sede activa (solo si la abriste tú). */
    sesion: Sesion | null;
    /** Cualquier sesión abierta en la sede activa. */
    sesion_sede: Sesion | null;
    mi_sesion_otra_sede: Sesion | null;
    puede_abrir: boolean;
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
    motivos_egreso: string[];
    medios: string[];
    auth_user_id: number | null;
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

export default function Index({
    sesion,
    sesion_sede,
    mi_sesion_otra_sede,
    puede_abrir,
    sesiones,
    egresos,
    totales_sesion,
    motivos_egreso,
    medios,
    auth_user_id,
}: Props) {
    const { t, i18n } = useTranslation(['caja', 'common']);
    const { can } = usePermission();
    const [abrirOpen, setAbrirOpen] = useState(false);
    const [cerrarOpen, setCerrarOpen] = useState(false);
    const [egresoOpen, setEgresoOpen] = useState(false);
    const [reabrirSesionId, setReabrirSesionId] = useState<string | null>(null);
    const [detalleSesionId, setDetalleSesionId] = useState<string | null>(null);
    const [imprimirSesionId, setImprimirSesionId] = useState<string | null>(
        null,
    );

    const esQuienAbrio = Boolean(sesion);

    const imprimirPdfUrl = useMemo(
        () => (imprimirSesionId ? caja.arqueoPdf(imprimirSesionId).url : ''),
        [imprimirSesionId],
    );

    const columns = useMemo<DataTableColumn<Sesion>[]>(() => {
        const base: DataTableColumn<Sesion>[] = [
            {
                key: 'sede',
                header: t('sesiones.columns.sede'),
                cell: (s) => (
                    <div className="min-w-0">
                        <p className="truncate font-medium">
                            {s.sede?.nombre ?? '—'}
                        </p>
                        {s.sede?.codigo ? (
                            <p className="text-xs text-muted-foreground">
                                {s.sede.codigo}
                            </p>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'estado',
                header: t('sesiones.columns.estado'),
                cell: (s) =>
                    s.estado === 'abierta' ? (
                        <StatBadge
                            label={t('sesion.estado_abierta')}
                            value=""
                            variant="success"
                        />
                    ) : (
                        <StatBadge
                            label={t('sesion.estado_cerrada')}
                            value=""
                            variant="warning"
                        />
                    ),
            },
            {
                key: 'moneda',
                header: t('sesiones.columns.moneda'),
                cell: (s) => (
                    <span className="font-mono text-sm">{s.moneda}</span>
                ),
                className: 'w-20',
            },
            {
                key: 'apertura',
                header: t('sesiones.columns.apertura'),
                cell: (s) => {
                    const ap = formatPeruDateTime(s.opened_at, i18n.language);
                    return (
                        <div className="tabular-nums">
                            <div>{ap.fecha}</div>
                            <div className="text-xs text-muted-foreground">
                                {ap.hora}
                            </div>
                        </div>
                    );
                },
            },
            {
                key: 'cierre',
                header: t('sesiones.columns.cierre'),
                cell: (s) => {
                    if (!s.closed_at) {
                        return <span className="text-muted-foreground">—</span>;
                    }
                    const ci = formatPeruDateTime(s.closed_at, i18n.language);
                    return (
                        <div className="text-muted-foreground tabular-nums">
                            <div>{ci.fecha}</div>
                            <div className="text-xs">{ci.hora}</div>
                        </div>
                    );
                },
            },
            {
                key: 'saldo_apertura',
                header: t('sesiones.columns.saldo_apertura'),
                cell: (s) => (
                    <span className="tabular-nums">
                        {money(s.monto_apertura)}
                    </span>
                ),
            },
            {
                key: 'efectivo_cierre',
                header: t('sesiones.columns.efectivo_cierre'),
                cell: (s) => (
                    <span className="tabular-nums">
                        {s.monto_cierre_contado != null
                            ? money(s.monto_cierre_contado)
                            : '—'}
                    </span>
                ),
            },
            {
                key: 'abierta_por',
                header: t('sesiones.columns.abierta_por'),
                cell: (s) => <span>{s.opened_by?.name ?? '—'}</span>,
            },
        ];

        base.push({
            key: 'acciones',
            header: (
                <span className="md:sr-only">
                    {t('sesiones.columns.acciones')}
                </span>
            ),
            align: 'right',
            cell: (s) => {
                if (s.estado === 'cerrada') {
                    return (
                        <div className="flex justify-end gap-0.5">
                            {s.puede_reabrir && can('caja.abrir') ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0 cursor-pointer border-0 bg-transparent text-emerald-600 shadow-none hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                                    onClick={() => setReabrirSesionId(s.id)}
                                    aria-label={t('sesiones.actions.reabrir')}
                                    title={t('sesiones.actions.reabrir')}
                                >
                                    <RotateCcw
                                        className="size-4"
                                        strokeWidth={2.25}
                                        aria-hidden
                                    />
                                </Button>
                            ) : null}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 cursor-pointer border-0 bg-transparent text-violet-600 shadow-none hover:bg-violet-500/10 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                                onClick={() => setDetalleSesionId(s.id)}
                                aria-label={t('sesiones.actions.arqueo_ver')}
                                title={t('sesiones.actions.arqueo_ver')}
                            >
                                <Eye
                                    className="size-4"
                                    strokeWidth={2.25}
                                    aria-hidden
                                />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 cursor-pointer border-0 bg-transparent text-sky-600 shadow-none hover:bg-sky-500/10 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                                onClick={() => setImprimirSesionId(s.id)}
                                aria-label={t('sesiones.actions.imprimir')}
                                title={t('sesiones.actions.imprimir')}
                            >
                                <Printer
                                    className="size-4"
                                    strokeWidth={2.25}
                                    aria-hidden
                                />
                            </Button>
                        </div>
                    );
                }

                if (s.estado === 'abierta') {
                    const soyQuienAbrio =
                        auth_user_id !== null &&
                        s.opened_by != null &&
                        s.opened_by.id === auth_user_id;

                    if (soyQuienAbrio && can('caja.cerrar')) {
                        return (
                            <div className="flex justify-end gap-0.5">
                                {can('caja.egreso') ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 shrink-0 cursor-pointer border-0 bg-transparent text-rose-600 shadow-none hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                                        onClick={() => setEgresoOpen(true)}
                                        aria-label={t('egreso.registrar')}
                                        title={t('egreso.registrar')}
                                    >
                                        <ArrowDownLeft
                                            className="size-4"
                                            strokeWidth={2.25}
                                            aria-hidden
                                        />
                                    </Button>
                                ) : null}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0 cursor-pointer border-0 bg-transparent text-amber-600 shadow-none hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                                    onClick={() => setCerrarOpen(true)}
                                    aria-label={t('sesiones.actions.cerrar')}
                                    title={t('sesiones.actions.cerrar')}
                                >
                                    <Lock
                                        className="size-4"
                                        strokeWidth={2.25}
                                        aria-hidden
                                    />
                                </Button>
                            </div>
                        );
                    }

                    if (can('caja.cerrar')) {
                        return (
                            <div className="flex justify-end">
                                <span className="max-w-[10rem] text-right text-xs leading-snug text-muted-foreground sm:max-w-none">
                                    {t('sesiones.row.cerrar_solo_si_abriste')}
                                </span>
                            </div>
                        );
                    }
                }

                return <span className="text-xs text-muted-foreground"> </span>;
            },
            className: 'w-24 sm:w-32',
        });

        return base;
    }, [t, i18n.language, can, auth_user_id]);

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
                            value: money(
                                sesion_sede?.monto_apertura ??
                                    sesion?.monto_apertura ??
                                    0,
                            ),
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
                        esQuienAbrio ? (
                            <Can permission="caja.cerrar">
                                <Button
                                    type="button"
                                    className="cursor-pointer gap-1.5"
                                    onClick={() => setCerrarOpen(true)}
                                >
                                    <Lock className="size-4" />
                                    {t('sesion.cerrar')}
                                </Button>
                            </Can>
                        ) : puede_abrir ? (
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
                        ) : null
                    }
                />

                {sesion ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Wallet className="size-4" aria-hidden />
                            </span>
                            <div className="space-y-1 text-sm">
                                <p className="font-semibold">
                                    {t('sesion.tu_abierta')}
                                </p>
                                <p className="text-muted-foreground">
                                    {t('sesion.abierta_en', {
                                        sede:
                                            sesion.sede?.nombre ??
                                            t('sesion.esta_sede'),
                                    })}{' '}
                                    {t('sesion.abierta_hint')}
                                    {' · '}
                                    {t('sesion.apertura')}:{' '}
                                    {money(sesion.monto_apertura)}
                                    {sesion.opened_by
                                        ? ` · ${t('sesion.opened_by', { name: sesion.opened_by.name })}`
                                        : null}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:shrink-0">
                            <Can permission="caja.egreso">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer gap-1.5 border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
                                    onClick={() => setEgresoOpen(true)}
                                >
                                    <ArrowDownLeft className="size-4" />
                                    {t('egreso.registrar')}
                                </Button>
                            </Can>
                            <Can permission="caja.cerrar">
                                <Button
                                    type="button"
                                    size="sm"
                                    className="cursor-pointer gap-1.5"
                                    onClick={() => setCerrarOpen(true)}
                                >
                                    <Lock className="size-4" />
                                    {t('sesion.ir_cerrar')}
                                </Button>
                            </Can>
                        </div>
                    </div>
                ) : sesion_sede ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
                        <strong>{t('sesion.ajena_titulo')}</strong>
                        {' — '}
                        {t('sesion.ajena_hint', {
                            name: sesion_sede.opened_by?.name ?? '—',
                        })}
                    </div>
                ) : mi_sesion_otra_sede ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
                        <strong>{t('sesion.tu_otra_sede')}</strong>
                        {' — '}
                        {t('sesion.tu_otra_sede_hint', {
                            sede: mi_sesion_otra_sede.sede?.nombre ?? '—',
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
                        <strong>{t('sesion.cerrada')}</strong>
                        {' — '}
                        {t('sesion.cerrada_hint')}
                    </div>
                )}

                {sesion || sesion_sede ? (
                    <section className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-base font-semibold">
                                {t('sections.egresos')}
                            </h2>
                            {esQuienAbrio ? (
                                <Can permission="caja.egreso">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="cursor-pointer gap-1.5 border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
                                        onClick={() => setEgresoOpen(true)}
                                    >
                                        <ArrowDownLeft className="size-4" />
                                        {t('egreso.registrar')}
                                    </Button>
                                </Can>
                            ) : null}
                        </div>
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
                                                {t(
                                                    `egreso.motivos.${e.motivo}`,
                                                )}
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    {t(`medios.${e.medio}`)}
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {
                                                    formatPeruDateTime(
                                                        e.created_at,
                                                    ).fecha
                                                }{' '}
                                                {
                                                    formatPeruDateTime(
                                                        e.created_at,
                                                    ).hora
                                                }
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
                    <h2 className="text-base font-semibold">
                        {t('sections.sesiones')}
                    </h2>
                    <DataTable
                        columns={columns}
                        data={sesiones}
                        rowKey={(s) => s.id}
                        emptyState={
                            <EmptyState
                                icon={Wallet}
                                title={t('empty.sesiones')}
                                description={t('empty.sesiones_hint')}
                            />
                        }
                    />
                </section>
            </div>

            <SesionAbrirModal open={abrirOpen} onOpenChange={setAbrirOpen} />

            <SesionCerrarModal
                open={cerrarOpen}
                onOpenChange={setCerrarOpen}
                sesionId={cerrarOpen ? (sesion?.id ?? null) : null}
            />

            <SesionEgresoModal
                open={egresoOpen}
                onOpenChange={setEgresoOpen}
                egresos={egresos}
                motivos={motivos_egreso}
                medios={medios}
                moneda={sesion?.moneda ?? sesion_sede?.moneda ?? 'PEN'}
            />

            <SesionReabrirDialog
                open={reabrirSesionId !== null}
                onOpenChange={(open) => {
                    if (!open) setReabrirSesionId(null);
                }}
                sesionId={reabrirSesionId}
            />

            <ArqueoPrintDialog
                open={imprimirSesionId !== null}
                onOpenChange={(open) => {
                    if (!open) setImprimirSesionId(null);
                }}
                pdfBaseUrl={imprimirPdfUrl}
            />

            <SesionArqueoDetalleModal
                open={detalleSesionId !== null}
                onOpenChange={(open) => {
                    if (!open) setDetalleSesionId(null);
                }}
                sesionId={detalleSesionId}
            />
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

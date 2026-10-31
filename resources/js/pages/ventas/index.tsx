import { Head, Link, router } from '@inertiajs/react';
import { Banknote, Receipt, ShoppingCart, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PageHeader } from '@/components/data-page';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';
import caja from '../caja/caja-routes';
import ventas from './ventas-routes';

type PedidoPendiente = {
    id: string;
    numero: number;
    canal: string;
    estado: string;
    total: string | number;
    mesa?: { id: string; codigo: string; nombre: string | null } | null;
    openedBy?: { id: number; name: string } | null;
    opened_by?: { id: number; name: string } | null;
    updated_at: string;
};

type VentaRow = {
    id: string;
    total: string | number;
    created_at: string;
    pedido?: {
        id: string;
        numero: number;
        canal: string;
        mesa?: { id: string; codigo: string; nombre: string | null } | null;
    } | null;
    pagos: { id: string; medio: string; monto: string | number }[];
    createdBy?: { id: number; name: string } | null;
    created_by?: { id: number; name: string } | null;
};

type Props = {
    sesion_abierta: boolean;
    ventas: VentaRow[];
    pedidos_pendientes: PedidoPendiente[];
    stats: { pendientes: number; ventas_hoy: number; total_hoy: number };
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

export default function Index({
    sesion_abierta,
    ventas: ventasHoy,
    pedidos_pendientes,
    stats,
}: Props) {
    const { t } = useTranslation(['ventas', 'caja', 'common']);

    return (
        <>
            <Head title={t('title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('description')}
                    stats={[
                        {
                            label: t('stats.pendientes'),
                            value: stats.pendientes,
                            variant: 'warning',
                            icon: ShoppingCart,
                        },
                        {
                            label: t('stats.ventas_hoy'),
                            value: stats.ventas_hoy,
                            variant: 'info',
                            icon: Receipt,
                        },
                        {
                            label: t('stats.total_hoy'),
                            value: money(stats.total_hoy),
                            variant: 'success',
                            icon: Banknote,
                        },
                    ]}
                />

                {!sesion_abierta ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-amber-950 dark:text-amber-100">
                            <strong>{t('caja_cerrada')}</strong>
                            {' — '}
                            {t('caja_cerrada_hint')}
                        </p>
                        <Can permission="caja.abrir">
                            <Button type="button" size="sm" asChild>
                                <Link href={caja.index().url}>{t('ir_caja')}</Link>
                            </Button>
                        </Can>
                    </div>
                ) : null}

                <section className="space-y-3">
                    <h2 className="text-base font-semibold">{t('sections.pendientes')}</h2>
                    {pedidos_pendientes.length === 0 ? (
                        <EmptyState
                            icon={ShoppingCart}
                            title={t('empty.pendientes')}
                            description={t('empty.pendientes_hint')}
                        />
                    ) : (
                        <div className="overflow-x-auto rounded-xl border bg-card/60">
                            <table className="w-full min-w-[36rem] text-left text-sm">
                                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">{t('columns.pedido')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.mesa')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.mesero')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.total')}</th>
                                        <th className="px-3 py-2 font-medium text-right">
                                            {t('columns.acciones')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {pedidos_pendientes.map((p) => {
                                        const mesero =
                                            p.openedBy?.name ?? p.opened_by?.name ?? '—';
                                        const mesa =
                                            p.mesa?.nombre?.trim() ||
                                            p.mesa?.codigo ||
                                            '—';

                                        return (
                                            <tr key={p.id} className="hover:bg-muted/30">
                                                <td className="px-3 py-2.5 font-medium tabular-nums">
                                                    #{p.numero}
                                                </td>
                                                <td className="px-3 py-2.5">{mesa}</td>
                                                <td className="px-3 py-2.5 text-muted-foreground">
                                                    {mesero}
                                                </td>
                                                <td className="px-3 py-2.5 font-semibold tabular-nums">
                                                    {money(p.total)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <Can
                                                        permission={[
                                                            'ventas.create',
                                                            'caja.cobrar',
                                                            'pedidos.cobrar',
                                                        ]}
                                                    >
                                                        {sesion_abierta ? (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="cursor-pointer gap-1.5"
                                                                asChild
                                                            >
                                                                <Link
                                                                    href={
                                                                        ventas.desdePedido(
                                                                            p.id,
                                                                        ).url
                                                                    }
                                                                >
                                                                    <Wallet className="size-4" />
                                                                    {t('actions.cobrar')}
                                                                </Link>
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="cursor-pointer gap-1.5"
                                                                onClick={() =>
                                                                    router.visit(
                                                                        caja.index().url,
                                                                    )
                                                                }
                                                            >
                                                                <Wallet className="size-4" />
                                                                {t('actions.cobrar')}
                                                            </Button>
                                                        )}
                                                    </Can>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="space-y-3">
                    <h2 className="text-base font-semibold">{t('sections.hoy')}</h2>
                    {ventasHoy.length === 0 ? (
                        <EmptyState
                            icon={Receipt}
                            title={t('empty.ventas')}
                            description={t('empty.ventas_hint')}
                        />
                    ) : (
                        <div className="overflow-x-auto rounded-xl border bg-card/60">
                            <table className="w-full min-w-[36rem] text-left text-sm">
                                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">{t('columns.hora')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.pedido')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.mesa')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.medios')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.total')}</th>
                                        <th className="px-3 py-2 font-medium">{t('columns.cajero')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {ventasHoy.map((v) => {
                                        const dt = formatPeruDateTime(v.created_at);
                                        const mesa =
                                            v.pedido?.mesa?.nombre?.trim() ||
                                            v.pedido?.mesa?.codigo ||
                                            '—';
                                        const cajero =
                                            v.createdBy?.name ??
                                            v.created_by?.name ??
                                            '—';

                                        return (
                                            <tr key={v.id} className="hover:bg-muted/30">
                                                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                                                    {dt.hora}
                                                </td>
                                                <td className="px-3 py-2.5 font-medium tabular-nums">
                                                    {v.pedido
                                                        ? `#${v.pedido.numero}`
                                                        : '—'}
                                                </td>
                                                <td className="px-3 py-2.5">{mesa}</td>
                                                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                                    {v.pagos
                                                        .map(
                                                            (p) =>
                                                                `${t(`caja:medios.${p.medio}`)} ${money(p.monto)}`,
                                                        )
                                                        .join(' · ')}
                                                </td>
                                                <td className="px-3 py-2.5 font-semibold tabular-nums">
                                                    {money(v.total)}
                                                </td>
                                                <td className="px-3 py-2.5">{cajero}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Ventas', href: '/ventas' },
        ]}
    >
        {page}
    </AppLayout>
);

import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ShoppingCart, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import { EmptyState, PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
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

type Props = {
    sesion_abierta: boolean;
    pedidos_pendientes: PedidoPendiente[];
    stats: { pendientes: number };
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

export default function Pendientes({
    sesion_abierta,
    pedidos_pendientes,
    stats,
}: Props) {
    const { t } = useTranslation(['ventas', 'common']);

    return (
        <>
            <Head title={t('pendientes_page.title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('pendientes_page.title')}
                    description={t('pendientes_page.description')}
                    stats={[
                        {
                            label: t('stats.pendientes'),
                            value: stats.pendientes,
                            variant: 'warning',
                            icon: ShoppingCart,
                        },
                    ]}
                    action={
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer gap-1.5"
                            asChild
                        >
                            <Link href={ventas.index().url}>
                                <ArrowLeft className="size-4" aria-hidden />
                                {t('actions.volver')}
                            </Link>
                        </Button>
                    }
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
                                    <th className="px-3 py-2 font-medium">
                                        {t('columns.pedido')}
                                    </th>
                                    <th className="px-3 py-2 font-medium">
                                        {t('columns.mesa')}
                                    </th>
                                    <th className="px-3 py-2 font-medium">
                                        {t('columns.mesero')}
                                    </th>
                                    <th className="px-3 py-2 font-medium">
                                        {t('columns.total')}
                                    </th>
                                    <th className="px-3 py-2 font-medium text-right">
                                        {t('columns.acciones')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {pedidos_pendientes.map((p) => {
                                    const mesero =
                                        p.openedBy?.name ??
                                        p.opened_by?.name ??
                                        '—';
                                    const mesa =
                                        p.mesa?.nombre?.trim() ||
                                        p.mesa?.codigo ||
                                        '—';

                                    return (
                                        <tr
                                            key={p.id}
                                            className="hover:bg-muted/30"
                                        >
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
                                                                <Wallet className="size-4" aria-hidden />
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
                                                                    caja.index()
                                                                        .url,
                                                                )
                                                            }
                                                        >
                                                            <Wallet className="size-4" aria-hidden />
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
            </div>
        </>
    );
}

Pendientes.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Ventas', href: '/ventas' },
            { title: 'Cobrar pedidos' },
        ]}
    >
        {page}
    </AppLayout>
);

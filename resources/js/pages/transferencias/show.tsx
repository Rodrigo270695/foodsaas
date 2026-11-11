import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatBadge } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import {
    TRANSFERENCIA_ESTADO_VARIANT,
    transferenciasUrl,
    type TransferenciaDetail,
} from './types';

type Props = { transferencia: TransferenciaDetail };

export default function TransferenciaShowPage({ transferencia }: Props) {
    const { t } = useTranslation(['transferencias', 'common']);
    const [busy, setBusy] = useState(false);

    const post = (url: string, confirmKey: string) => {
        if (!window.confirm(t(confirmKey))) return;
        router.post(
            url,
            {},
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <>
            <Head title={t('show.title', { numero: transferencia.numero })} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {t('show.title', {
                                    numero: transferencia.numero,
                                })}
                            </h1>
                            <StatBadge
                                label={t(`estados.${transferencia.estado}`)}
                                value=""
                                variant={
                                    TRANSFERENCIA_ESTADO_VARIANT[
                                        transferencia.estado
                                    ]
                                }
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('show.ruta', {
                                origen: transferencia.origen ?? '—',
                                destino: transferencia.destino ?? '—',
                            })}
                        </p>
                        {transferencia.notas ? (
                            <p className="text-sm">{transferencia.notas}</p>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer"
                        >
                            <Link href={transferenciasUrl.index}>
                                {t('common:actions.back')}
                            </Link>
                        </Button>
                        {transferencia.can_enviar ? (
                            <Button
                                type="button"
                                disabled={busy}
                                className="cursor-pointer"
                                onClick={() =>
                                    post(
                                        transferenciasUrl.enviar(
                                            transferencia.id,
                                        ),
                                        'actions.confirm_enviar',
                                    )
                                }
                            >
                                {t('actions.enviar')}
                            </Button>
                        ) : null}
                        {transferencia.can_recibir ? (
                            <Button
                                type="button"
                                disabled={busy}
                                className="cursor-pointer"
                                onClick={() =>
                                    post(
                                        transferenciasUrl.recibir(
                                            transferencia.id,
                                        ),
                                        'actions.confirm_recibir',
                                    )
                                }
                            >
                                {t('actions.recibir')}
                            </Button>
                        ) : null}
                        {transferencia.can_anular ? (
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={busy}
                                className="cursor-pointer"
                                onClick={() =>
                                    post(
                                        transferenciasUrl.anular(
                                            transferencia.id,
                                        ),
                                        'actions.confirm_anular',
                                    )
                                }
                            >
                                {t('actions.anular')}
                            </Button>
                        ) : null}
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-3 py-2">{t('show.tipo')}</th>
                                <th className="px-3 py-2">
                                    {t('show.origen')}
                                </th>
                                <th className="px-3 py-2">
                                    {t('show.destino')}
                                </th>
                                <th className="px-3 py-2 text-right">
                                    {t('show.cantidad')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {transferencia.lineas.map((linea) => (
                                <tr key={linea.id}>
                                    <td className="px-3 py-2 text-muted-foreground">
                                        {t(
                                            linea.tipo === 'insumo'
                                                ? 'form.tipo_insumo'
                                                : 'form.tipo_producto',
                                        )}
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                        {linea.origen ?? '—'}
                                    </td>
                                    <td className="px-3 py-2">
                                        {linea.destino ?? '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {linea.cantidad} {linea.unidad}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

TransferenciaShowPage.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Transferencias', href: '/transferencias' },
            { title: 'Detalle' },
        ]}
    >
        {page}
    </AppLayout>
);

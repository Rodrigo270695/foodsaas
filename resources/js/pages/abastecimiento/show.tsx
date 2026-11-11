import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatBadge } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import {
    REQUERIMIENTO_ESTADO_VARIANT,
    abastecimientoUrl,
    type RequerimientoDetail,
} from './types';

type Props = { requerimiento: RequerimientoDetail };

export default function AbastecimientoShowPage({ requerimiento }: Props) {
    const { t } = useTranslation(['abastecimiento', 'common']);
    const [busy, setBusy] = useState(false);
    const { estado } = requerimiento;

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
            <Head title={t('show.title', { numero: requerimiento.numero })} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {t('show.title', {
                                    numero: requerimiento.numero,
                                })}
                            </h1>
                            <StatBadge
                                label={t(`estados.${estado}`)}
                                value=""
                                variant={REQUERIMIENTO_ESTADO_VARIANT[estado]}
                            />
                            <StatBadge
                                label={t(
                                    `prioridades.${requerimiento.prioridad}`,
                                )}
                                value=""
                                variant={
                                    requerimiento.prioridad === 'alta'
                                        ? 'danger'
                                        : 'muted'
                                }
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('show.ruta', {
                                solicitante: requerimiento.solicitante ?? '—',
                                abastecedora: requerimiento.abastecedora ?? '—',
                            })}
                            {requerimiento.fecha_necesaria
                                ? ` · ${t('show.fecha_necesaria')}: ${requerimiento.fecha_necesaria}`
                                : ''}
                        </p>
                        {requerimiento.notas ? (
                            <p className="text-sm">{requerimiento.notas}</p>
                        ) : null}
                        {requerimiento.transferencia ? (
                            <p className="text-sm">
                                {t('show.transferencia')}:{' '}
                                <Link
                                    href={`/transferencias/${requerimiento.transferencia.id}`}
                                    className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
                                >
                                    {t('show.ver_transferencia', {
                                        numero: requerimiento.transferencia
                                            .numero,
                                    })}
                                </Link>
                            </p>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer"
                        >
                            <Link href={abastecimientoUrl.index}>
                                {t('common:actions.back')}
                            </Link>
                        </Button>
                        {estado === 'borrador' ? (
                            <Button
                                type="button"
                                disabled={busy}
                                className="cursor-pointer"
                                onClick={() =>
                                    post(
                                        abastecimientoUrl.solicitar(
                                            requerimiento.id,
                                        ),
                                        'actions.confirm_solicitar',
                                    )
                                }
                            >
                                {t('actions.solicitar')}
                            </Button>
                        ) : null}
                        {estado === 'solicitado' ? (
                            <>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    disabled={busy}
                                    className="cursor-pointer"
                                    onClick={() =>
                                        post(
                                            abastecimientoUrl.rechazar(
                                                requerimiento.id,
                                            ),
                                            'actions.confirm_rechazar',
                                        )
                                    }
                                >
                                    {t('actions.rechazar')}
                                </Button>
                                <Button
                                    type="button"
                                    disabled={busy}
                                    className="cursor-pointer"
                                    onClick={() =>
                                        post(
                                            abastecimientoUrl.aprobar(
                                                requerimiento.id,
                                            ),
                                            'actions.confirm_aprobar',
                                        )
                                    }
                                >
                                    {t('actions.aprobar')}
                                </Button>
                            </>
                        ) : null}
                        {estado === 'aprobado' &&
                        !requerimiento.transferencia ? (
                            <Button
                                type="button"
                                disabled={busy}
                                className="cursor-pointer"
                                onClick={() =>
                                    post(
                                        abastecimientoUrl.generarTransferencia(
                                            requerimiento.id,
                                        ),
                                        'actions.confirm_generar',
                                    )
                                }
                            >
                                {t('actions.generar')}
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
                                    {t('show.nombre')}
                                </th>
                                <th className="px-3 py-2 text-right">
                                    {t('show.cantidad')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {requerimiento.lineas.map((linea) => (
                                <tr key={linea.id}>
                                    <td className="px-3 py-2 text-muted-foreground">
                                        {t(
                                            linea.tipo === 'insumo'
                                                ? 'form.tipo_insumo'
                                                : 'form.tipo_producto',
                                        )}
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                        {linea.nombre}
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

AbastecimientoShowPage.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Abastecimiento', href: '/abastecimiento' },
            { title: 'Detalle' },
        ]}
    >
        {page}
    </AppLayout>
);

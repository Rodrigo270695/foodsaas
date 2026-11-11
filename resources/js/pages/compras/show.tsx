import { Head, Link, router } from '@inertiajs/react';
import { Loader2, Pencil } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import { StatBadge } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import compras from './compras-routes';
import type { CompraDetail, CompraEstado } from './types';

type Props = { compra: CompraDetail };

type RecibirLinea = { linea_id: string; cantidad: string };

function money(value: string | number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(Number(value));
}

const ESTADO_VARIANT: Record<
    CompraEstado,
    'muted' | 'info' | 'warning' | 'success' | 'danger'
> = {
    borrador: 'muted',
    enviada: 'info',
    parcial: 'warning',
    recibida: 'success',
    anulada: 'danger',
};

export default function CompraShowPage({ compra }: Props) {
    const { t } = useTranslation(['compras', 'common']);

    const pendientes = useMemo(
        () => compra.lineas.filter((l) => (l.pendiente ?? 0) > 0),
        [compra.lineas],
    );

    const [recibirLineas, setRecibirLineas] = useState<RecibirLinea[]>(() =>
        pendientes.map((l) => ({
            linea_id: l.id as string,
            cantidad: String(l.pendiente ?? ''),
        })),
    );
    const [saving, setSaving] = useState(false);

    const canSubmitRecibir = useMemo(
        () => !saving && recibirLineas.some((l) => Number(l.cantidad) > 0),
        [saving, recibirLineas],
    );

    const onRecibir = (event: FormEvent) => {
        event.preventDefault();
        const lineas = recibirLineas.filter((l) => Number(l.cantidad) > 0);
        router.post(
            compras.recibir(compra.id).url,
            { lineas },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <>
            <Head title={t('show.title', { numero: compra.numero })} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {t('show.title', { numero: compra.numero })}
                            </h1>
                            <StatBadge
                                label={t(`estados.${compra.estado}`)}
                                value=""
                                variant={ESTADO_VARIANT[compra.estado]}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {compra.fecha}
                            {compra.proveedor
                                ? ` · ${compra.proveedor.nombre}`
                                : ''}
                            {` · ${money(compra.total)}`}
                        </p>
                        {compra.notas ? (
                            <p className="text-sm">{compra.notas}</p>
                        ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer"
                        >
                            <Link href={compras.index().url}>
                                {t('common:actions.back')}
                            </Link>
                        </Button>
                        {compra.can_edit ? (
                            <Can permission="compras.update">
                                <Button
                                    type="button"
                                    variant="outline"
                                    asChild
                                    className="cursor-pointer gap-2"
                                >
                                    <Link href={compras.edit(compra.id).url}>
                                        <Pencil className="size-4" />
                                        {t('actions.edit')}
                                    </Link>
                                </Button>
                            </Can>
                        ) : null}
                        {compra.can_emitir ? (
                            <Can permission="compras.update">
                                <Button
                                    type="button"
                                    className="cursor-pointer"
                                    onClick={() =>
                                        router.post(
                                            compras.emitir(compra.id).url,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    {t('actions.emitir')}
                                </Button>
                            </Can>
                        ) : null}
                        {compra.can_anular ? (
                            <Can permission="compras.delete">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    className="cursor-pointer"
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                t('actions.anular') + '?',
                                            )
                                        ) {
                                            router.post(
                                                compras.anular(compra.id).url,
                                                {},
                                                { preserveScroll: true },
                                            );
                                        }
                                    }}
                                >
                                    {t('actions.anular')}
                                </Button>
                            </Can>
                        ) : null}
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-3 py-2">{t('form.item')}</th>
                                <th className="px-3 py-2 text-right">
                                    {t('show.pedida')}
                                </th>
                                <th className="px-3 py-2 text-right">
                                    {t('show.recibida')}
                                </th>
                                <th className="px-3 py-2 text-right">
                                    {t('show.pendiente')}
                                </th>
                                <th className="px-3 py-2 text-right">
                                    {t('form.costo')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {compra.lineas.map((linea) => (
                                <tr key={linea.id}>
                                    <td className="px-3 py-2">
                                        <p className="font-medium">
                                            {linea.nombre}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {t(
                                                `form.tipo_${linea.linea_tipo === 'insumo' ? 'insumo' : 'producto'}`,
                                            )}{' '}
                                            · {linea.unidad}
                                        </p>
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {linea.cantidad}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {linea.cantidad_recibida}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {linea.pendiente}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {money(linea.costo_unitario)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {compra.can_recibir ? (
                    <Can permission="compras.receive">
                        <form
                            onSubmit={onRecibir}
                            className="flex flex-col gap-3 rounded-xl border p-4"
                        >
                            <div>
                                <h2 className="text-sm font-semibold">
                                    {t('show.recibir_title')}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {t('show.recibir_hint')}
                                </p>
                            </div>
                            <div className="grid gap-2">
                                {pendientes.map((linea, index) => (
                                    <div
                                        key={linea.id}
                                        className="grid items-center gap-2 sm:grid-cols-[1fr_8rem]"
                                    >
                                        <span className="text-sm">
                                            {linea.nombre}{' '}
                                            <span className="text-muted-foreground">
                                                (máx. {linea.pendiente}{' '}
                                                {linea.unidad})
                                            </span>
                                        </span>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={linea.pendiente}
                                            step="0.001"
                                            placeholder={t('show.a_recibir')}
                                            value={
                                                recibirLineas[index]
                                                    ?.cantidad ?? ''
                                            }
                                            onChange={(e) => {
                                                const next = [...recibirLineas];
                                                next[index] = {
                                                    linea_id: linea.id as string,
                                                    cantidad: e.target.value,
                                                };
                                                setRecibirLineas(next);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <Button
                                    type="submit"
                                    disabled={!canSubmitRecibir}
                                    className="cursor-pointer gap-2"
                                >
                                    {saving ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : null}
                                    {t('show.submit_recibir')}
                                </Button>
                            </div>
                        </form>
                    </Can>
                ) : null}
            </div>
        </>
    );
}

CompraShowPage.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Compras', href: '/compras' },
            { title: 'Detalle' },
        ]}
    >
        {page}
    </AppLayout>
);

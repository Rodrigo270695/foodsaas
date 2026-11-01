import { router } from '@inertiajs/react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal } from '@/components/forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';
import { cn } from '@/lib/utils';
import ventas from '../ventas-routes';

type VentaDetalle = {
    id: string;
    numero: string | null;
    numero_display?: string | null;
    origen: string;
    tipo_comprobante: string;
    fel_estado?: string;
    cpe_numero?: string | null;
    fel_pdf_url?: string | null;
    fel_pdf_a4_url?: string | null;
    fel_enlace_consulta?: string | null;
    fel_error?: string | null;
    anulado_at?: string | null;
    motivo_anulacion?: string | null;
    puede_anular?: boolean;
    cliente_nombre: string | null;
    cliente_documento: string | null;
    estado: string;
    subtotal: string;
    descuento: string;
    total: string;
    created_at: string | null;
    sede: { id: string; nombre: string; codigo: string } | null;
    pedido: {
        id: string;
        numero: number;
        canal: string;
        mesa: { codigo: string; nombre: string | null } | null;
    } | null;
    pagos: {
        id: string;
        medio: string;
        monto: string;
        referencia: string | null;
    }[];
    created_by: { id: number; name: string } | null;
    lineas: {
        id: string;
        nombre: string;
        cantidad: string;
        precio_unitario: string;
        importe: string;
    }[];
};

type CpePayload = {
    venta_id: string;
    tipo_comprobante: string;
    numero_completo: string | null;
    pdf_ticket_url: string | null;
    pdf_a4_url: string | null;
    enlace_consulta: string | null;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ventaId: string | null;
    onImprimir?: (ventaId: string) => void;
    onImprimirCpe?: (payload: CpePayload) => void;
    onEmitirCpe?: (ventaId: string) => void;
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

function csrfToken(): string {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute('content') ?? '';
}

export function VentaDetalleModal({
    open,
    onOpenChange,
    ventaId,
    onImprimir,
    onImprimirCpe,
    onEmitirCpe,
}: Props) {
    const { t } = useTranslation(['ventas', 'caja', 'common']);
    const [venta, setVenta] = useState<VentaDetalle | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [anularOpen, setAnularOpen] = useState(false);
    const [motivo, setMotivo] = useState('');
    const [anulando, setAnulando] = useState(false);

    useEffect(() => {
        if (!open || !ventaId) {
            return;
        }

        setVenta(null);
        setError(null);
        setAnularOpen(false);
        setMotivo('');
        setLoading(true);

        const token = csrfToken();

        void fetch(ventas.detalle(ventaId).url, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(token ? { 'X-CSRF-TOKEN': token } : {}),
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error('detalle_failed');
                }
                return res.json() as Promise<{ venta: VentaDetalle }>;
            })
            .then((json) => {
                setVenta(json.venta);
            })
            .catch(() => {
                setError(t('detalle.error'));
            })
            .finally(() => {
                setLoading(false);
            });
    }, [open, ventaId, t]);

    const dt = venta?.created_at
        ? formatPeruDateTime(venta.created_at)
        : null;
    const anuladoDt = venta?.anulado_at
        ? formatPeruDateTime(venta.anulado_at)
        : null;

    const confirmarAnulacion = () => {
        if (!venta || motivo.trim().length < 5) {
            return;
        }
        setAnulando(true);
        router.post(
            ventas.anular(venta.id).url,
            { motivo: motivo.trim() },
            {
                preserveScroll: true,
                onFinish: () => {
                    setAnulando(false);
                    setAnularOpen(false);
                    onOpenChange(false);
                },
            },
        );
    };

    const esSunat =
        venta?.tipo_comprobante === 'boleta' ||
        venta?.tipo_comprobante === 'factura';

    return (
        <>
        <FormModal
            open={open && ventaId !== null}
            onOpenChange={onOpenChange}
            size="lg"
            title={t('detalle.title')}
            description={
                venta?.numero
                    ? t('detalle.description_numero', { numero: venta.numero })
                    : t('detalle.description')
            }
            footer={
                <div className="flex w-full flex-wrap justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common:actions.close')}
                    </Button>
                    {venta &&
                    (venta.tipo_comprobante === 'boleta' ||
                        venta.tipo_comprobante === 'factura') &&
                    (venta.fel_estado === 'sin_cpe' ||
                        venta.fel_estado === 'rechazado') &&
                    onEmitirCpe ? (
                        <Button
                            type="button"
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => onEmitirCpe(venta.id)}
                        >
                            {t('actions_extra.reintentar_cpe')}
                        </Button>
                    ) : null}
                    {venta &&
                    venta.fel_estado === 'emitido' &&
                    (venta.fel_pdf_url || venta.fel_enlace_consulta) &&
                    onImprimirCpe ? (
                        <Button
                            type="button"
                            className="cursor-pointer"
                            onClick={() =>
                                onImprimirCpe({
                                    venta_id: venta.id,
                                    tipo_comprobante: venta.tipo_comprobante,
                                    numero_completo: venta.cpe_numero ?? null,
                                    pdf_ticket_url: venta.fel_pdf_url ?? null,
                                    pdf_a4_url: venta.fel_pdf_a4_url ?? null,
                                    enlace_consulta:
                                        venta.fel_enlace_consulta ?? null,
                                })
                            }
                        >
                            {t('actions_extra.imprimir_cpe')}
                        </Button>
                    ) : venta && venta.estado !== 'anulada' && onImprimir ? (
                        <Button
                            type="button"
                            className="cursor-pointer"
                            onClick={() => onImprimir(venta.id)}
                        >
                            {t('actions.imprimir_ticket')}
                        </Button>
                    ) : null}
                </div>
            }
        >
            <div className="flex w-full min-w-0 flex-col gap-4">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        {t('detalle.loading')}
                    </div>
                ) : null}

                {error ? (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                ) : null}

                {venta ? (
                    <>
                        {venta.estado === 'anulada' ? (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                <p className="font-medium">
                                    {t('anulacion.banner')}
                                    {anuladoDt
                                        ? ` · ${anuladoDt.fecha}, ${anuladoDt.hora}`
                                        : null}
                                </p>
                                {venta.motivo_anulacion ? (
                                    <p className="mt-1 text-xs">
                                        {t('anulacion.motivo_label')}{' '}
                                        {venta.motivo_anulacion}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                className={cn(
                                    venta.estado === 'pagada' &&
                                        'border-transparent bg-emerald-600/90 text-white',
                                    venta.estado === 'anulada' &&
                                        'bg-destructive text-white',
                                )}
                            >
                                {t(`estado.${venta.estado}`, {
                                    defaultValue: venta.estado,
                                })}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                {t(`tipo.${venta.tipo_comprobante}`)} ·{' '}
                                {t(`origen.${venta.origen}`)}
                                {venta.fel_estado
                                    ? ` · ${t(`sunat.${venta.fel_estado === 'sin_cpe' ? 'sin_comprobante' : venta.fel_estado}`, { defaultValue: venta.fel_estado })}`
                                    : null}
                            </span>
                        </div>

                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-xs text-muted-foreground">
                                    {t('columns.numero')}
                                </dt>
                                <dd className="font-semibold tabular-nums text-brand-700">
                                    {venta.cpe_numero ??
                                        venta.numero_display ??
                                        venta.numero ??
                                        '—'}
                                </dd>
                                {venta.cpe_numero && venta.numero ? (
                                    <p className="text-[11px] text-muted-foreground">
                                        {venta.numero}
                                    </p>
                                ) : null}
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground">
                                    {t('columns.fecha')}
                                </dt>
                                <dd className="tabular-nums">
                                    {dt
                                        ? `${dt.fecha}, ${dt.hora}`
                                        : '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground">
                                    {t('columns.cliente')}
                                </dt>
                                <dd>
                                    {venta.cliente_nombre?.trim() || 'Varios'}
                                    {venta.cliente_documento ? (
                                        <span className="mt-0.5 block text-xs text-muted-foreground">
                                            {venta.cliente_documento}
                                        </span>
                                    ) : null}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground">
                                    {t('columns.cajero')}
                                </dt>
                                <dd>{venta.created_by?.name ?? '—'}</dd>
                            </div>
                            {venta.sede ? (
                                <div>
                                    <dt className="text-xs text-muted-foreground">
                                        {t('columns.sede')}
                                    </dt>
                                    <dd>{venta.sede.nombre}</dd>
                                </div>
                            ) : null}
                            {venta.pedido?.mesa ? (
                                <div>
                                    <dt className="text-xs text-muted-foreground">
                                        {t('columns.mesa')}
                                    </dt>
                                    <dd>
                                        {venta.pedido.mesa.nombre?.trim() ||
                                            venta.pedido.mesa.codigo}
                                    </dd>
                                </div>
                            ) : null}
                        </dl>

                        {venta.lineas.length > 0 ? (
                            <div className="overflow-hidden rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">
                                                {t('detalle.producto')}
                                            </th>
                                            <th className="px-3 py-2 text-right font-medium">
                                                {t('detalle.cant')}
                                            </th>
                                            <th className="px-3 py-2 text-right font-medium">
                                                {t('detalle.importe')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {venta.lineas.map((l) => (
                                            <tr key={l.id}>
                                                <td className="px-3 py-2">
                                                    {l.nombre}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {Number(l.cantidad).toFixed(
                                                        3,
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium tabular-nums">
                                                    {money(l.importe)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}

                        <dl className="space-y-1 border-t pt-3 text-sm">
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">
                                    {t('nueva.subtotal')}
                                </dt>
                                <dd className="tabular-nums">
                                    {money(venta.subtotal)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">
                                    {t('nueva.descuento')}
                                </dt>
                                <dd className="tabular-nums">
                                    −{money(venta.descuento)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-3 text-base font-semibold text-brand-700">
                                <dt>{t('nueva.total')}</dt>
                                <dd className="tabular-nums">
                                    {money(venta.total)}
                                </dd>
                            </div>
                        </dl>

                        {venta.pagos.length > 0 ? (
                            <div>
                                <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    {t('detalle.pagos')}
                                </p>
                                <ul className="space-y-1 text-sm">
                                    {venta.pagos.map((p) => (
                                        <li
                                            key={p.id}
                                            className="flex justify-between gap-3"
                                        >
                                            <span>
                                                {t(`caja:medios.${p.medio}`, {
                                                    defaultValue: p.medio,
                                                })}
                                            </span>
                                            <span className="font-medium tabular-nums">
                                                {money(p.monto)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}

                        {venta.puede_anular && venta.estado !== 'anulada' ? (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                                <p className="text-sm font-medium text-destructive">
                                    {t('anulacion.title')}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {esSunat
                                        ? t('anulacion.desc_sunat')
                                        : t('anulacion.desc_ticket')}
                                </p>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="mt-3 cursor-pointer"
                                    onClick={() => setAnularOpen(true)}
                                >
                                    {t('actions.anular_venta')}
                                </Button>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </div>
        </FormModal>

        <Dialog open={anularOpen} onOpenChange={setAnularOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('anulacion.title')}</DialogTitle>
                    <DialogDescription>
                        {esSunat
                            ? t('anulacion.desc_sunat')
                            : t('anulacion.desc_ticket')}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="motivo-anulacion">
                        {t('anulacion.motivo')}
                    </Label>
                    <Textarea
                        id="motivo-anulacion"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder={t('anulacion.motivo_placeholder')}
                        rows={3}
                        disabled={anulando}
                    />
                </div>
                <DialogFooter className="gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        disabled={anulando}
                        onClick={() => setAnularOpen(false)}
                    >
                        {t('anulacion.cancelar')}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        className="cursor-pointer gap-1.5"
                        disabled={anulando || motivo.trim().length < 5}
                        onClick={confirmarAnulacion}
                    >
                        {anulando ? (
                            <Loader2
                                className="size-3.5 animate-spin"
                                aria-hidden
                            />
                        ) : null}
                        {anulando
                            ? t('anulacion.procesando')
                            : t('anulacion.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}

import { Loader2, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toastManager } from '@/lib/toast';
import { cn } from '@/lib/utils';
import ventas from '../ventas-routes';

type Props = {
    tipo: string;
    tiposComprobante: string[];
    clienteNombre: string;
    clienteDoc: string;
    onTipoChange: (tipo: string) => void;
    onClienteNombreChange: (value: string) => void;
    onClienteDocChange: (value: string) => void;
};

export function ClienteComprobanteSection({
    tipo,
    tiposComprobante,
    clienteNombre,
    clienteDoc,
    onTipoChange,
    onClienteNombreChange,
    onClienteDocChange,
}: Props) {
    const { t } = useTranslation('ventas');
    const [consultando, setConsultando] = useState(false);
    const lastConsultaRef = useRef<string | null>(null);

    const requiereDoc = tipo === 'boleta' || tipo === 'factura';
    const docMaxLen = tipo === 'factura' ? 11 : tipo === 'boleta' ? 8 : 0;
    const docCompleto =
        requiereDoc &&
        clienteDoc.replace(/\D/g, '').length === docMaxLen;

    const hint =
        tipo === 'factura'
            ? t('nueva.cliente_hint_factura')
            : tipo === 'boleta'
              ? t('nueva.cliente_hint_boleta')
              : t('nueva.cliente_hint_ticket');

    const consultarDocumento = async (forced?: string) => {
        const digits = (forced ?? clienteDoc).replace(/\D/g, '');
        if (tipo === 'boleta' && digits.length !== 8) {
            toastManager.error({ title: t('nueva.consulta_dni_invalido') });
            return;
        }
        if (tipo === 'factura' && digits.length !== 11) {
            toastManager.error({ title: t('nueva.consulta_ruc_invalido') });
            return;
        }

        const key = `${tipo}:${digits}`;
        lastConsultaRef.current = key;
        setConsultando(true);

        try {
            const url =
                tipo === 'factura'
                    ? ventas.consultaRuc(digits).url
                    : ventas.consultaDni(digits).url;

            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            const body = (await res.json()) as {
                success?: boolean;
                message?: string;
                data?: {
                    nombre_completo?: string;
                    nombres?: string;
                    apellidos?: string;
                    dni?: string;
                    razon_social?: string;
                    ruc?: string;
                };
            };

            if (!res.ok || !body.success || !body.data) {
                toastManager.error({
                    title:
                        body.message ??
                        (tipo === 'factura'
                            ? t('nueva.consulta_ruc_error')
                            : t('nueva.consulta_dni_error')),
                });
                return;
            }

            if (tipo === 'factura') {
                const razon = body.data.razon_social?.trim() ?? '';
                onClienteDocChange(body.data.ruc ?? digits);
                if (razon) {
                    onClienteNombreChange(razon);
                    toastManager.success({
                        title: t('nueva.consulta_ok'),
                    });
                }
            } else {
                const completo =
                    body.data.nombre_completo?.trim() ||
                    [body.data.nombres, body.data.apellidos]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                onClienteDocChange(body.data.dni ?? digits);
                if (completo) {
                    onClienteNombreChange(completo);
                    toastManager.success({
                        title: t('nueva.consulta_ok'),
                    });
                }
            }
        } catch {
            toastManager.error({
                title:
                    tipo === 'factura'
                        ? t('nueva.consulta_ruc_error')
                        : t('nueva.consulta_dni_error'),
            });
        } finally {
            setConsultando(false);
        }
    };

    useEffect(() => {
        if (!requiereDoc || !docCompleto || consultando) {
            return;
        }
        const digits = clienteDoc.replace(/\D/g, '');
        const key = `${tipo}:${digits}`;
        if (lastConsultaRef.current === key) {
            return;
        }
        void consultarDocumento(digits);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clienteDoc, tipo, docCompleto]);

    useEffect(() => {
        lastConsultaRef.current = null;
    }, [tipo]);

    const showTipoToggle = tiposComprobante.length > 1;

    return (
        <section className="rounded-xl border bg-card/70 p-3">
            <div
                className={cn(
                    'grid gap-3 sm:items-start',
                    showTipoToggle
                        ? 'sm:grid-cols-[minmax(0,1fr)_auto]'
                        : 'sm:grid-cols-1',
                )}
            >
                <div className="space-y-1.5">
                    <Label htmlFor="cliente" className="text-xs leading-none">
                        {t('nueva.cliente')}
                    </Label>
                    <Input
                        id="cliente"
                        value={clienteNombre}
                        placeholder={t('nueva.cliente_placeholder')}
                        onChange={(e) => onClienteNombreChange(e.target.value)}
                        className="h-9"
                    />
                </div>
                {showTipoToggle ? (
                    <div
                        className={cn(
                            'space-y-1.5',
                            tiposComprobante.length >= 3
                                ? 'sm:w-[15rem]'
                                : 'sm:w-[10rem]',
                        )}
                    >
                        <Label className="text-xs leading-none">
                            {t('nueva.comprobante')}
                        </Label>
                        <ToggleGroup
                            type="single"
                            value={tipo}
                            onValueChange={(v) => {
                                if (v) {
                                    onTipoChange(v);
                                }
                            }}
                            variant="outline"
                            size="sm"
                            className={cn(
                                'grid h-9 w-full',
                                tiposComprobante.length >= 3
                                    ? 'grid-cols-3'
                                    : 'grid-cols-2',
                            )}
                        >
                            {tiposComprobante.map((item) => (
                                <ToggleGroupItem
                                    key={item}
                                    value={item}
                                    className="h-9 cursor-pointer px-2 text-xs capitalize data-[state=on]:bg-brand-50 data-[state=on]:text-brand-800 dark:data-[state=on]:bg-brand-950/50 dark:data-[state=on]:text-brand-100"
                                >
                                    {t(`tipo.${item}`)}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>
                ) : null}
                <p className="text-[11px] leading-snug text-muted-foreground sm:col-span-2">
                    {hint}
                </p>
            </div>

            {requiereDoc ? (
                <div className="mt-3 space-y-1.5">
                    <Label htmlFor="doc" className="text-xs">
                        {tipo === 'factura'
                            ? t('nueva.documento_ruc')
                            : t('nueva.documento_dni')}
                    </Label>
                    <div className="flex max-w-md items-center gap-2">
                        <Input
                            id="doc"
                            value={clienteDoc}
                            inputMode="numeric"
                            placeholder={
                                tipo === 'factura'
                                    ? t('nueva.documento_placeholder_factura')
                                    : t('nueva.documento_placeholder_boleta')
                            }
                            onChange={(e) =>
                                onClienteDocChange(
                                    e.target.value
                                        .replace(/\D/g, '')
                                        .slice(0, docMaxLen || 11),
                                )
                            }
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void consultarDocumento();
                                }
                            }}
                            className="h-9"
                            disabled={consultando}
                        />
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 shrink-0 cursor-pointer gap-1.5"
                            disabled={!docCompleto || consultando}
                            onClick={() => void consultarDocumento()}
                        >
                            {consultando ? (
                                <Loader2
                                    className="size-3.5 animate-spin"
                                    aria-hidden
                                />
                            ) : (
                                <Search className="size-3.5" aria-hidden />
                            )}
                            {t('nueva.consultar')}
                        </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        {t('nueva.consulta_hint')}
                    </p>
                </div>
            ) : null}
        </section>
    );
}

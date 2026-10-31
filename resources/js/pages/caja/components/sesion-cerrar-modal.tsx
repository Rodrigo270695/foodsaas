import { useForm } from '@inertiajs/react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toastManager } from '@/lib/toast';
import caja from '../caja-routes';
import { ArqueoResumen } from './arqueo-resumen';
import {
    emptySaldosBilleteras,
    formatArqueoMoney,
    type ArqueoPayload,
    type CajaBilleteraCodigo,
    type SaldosBilleterasForm,
} from './arqueo-types';
import { BilleterasMontosFields } from './billeteras-montos-fields';

type SesionCerrarModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sesionId: string | null;
};

type FormData = {
    saldo_cierre_efectivo: string;
    saldos_cierre: SaldosBilleterasForm;
    notas: string;
};

const emptyForm = (): FormData => ({
    saldo_cierre_efectivo: '',
    saldos_cierre: emptySaldosBilleteras('0'),
    notas: '',
});

export function SesionCerrarModal({
    open,
    onOpenChange,
    sesionId,
}: SesionCerrarModalProps) {
    const { t, i18n } = useTranslation(['caja', 'common']);
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FormData>(emptyForm);
    const [arqueo, setArqueo] = useState<ArqueoPayload | null>(null);
    const [loadingArqueo, setLoadingArqueo] = useState(false);
    const [arqueoError, setArqueoError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !sesionId) {
            return;
        }

        reset();
        clearErrors();
        setData(emptyForm());
        setArqueo(null);
        setArqueoError(null);
        setLoadingArqueo(true);

        void fetch(caja.arqueo(sesionId).url, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error('arqueo_failed');
                }

                return res.json() as Promise<{ arqueo: ArqueoPayload }>;
            })
            .then((json) => {
                setArqueo(json.arqueo);
                const billeteras = emptySaldosBilleteras('0');
                for (const row of json.arqueo.billeteras ?? []) {
                    if (row.codigo in billeteras) {
                        billeteras[row.codigo as CajaBilleteraCodigo] =
                            row.esperado;
                    }
                }
                setData({
                    saldo_cierre_efectivo: json.arqueo.efectivo_esperado ?? '',
                    saldos_cierre: billeteras,
                    notas: '',
                });
            })
            .catch(() => {
                setArqueoError(t('sesiones.dialog_cerrar.arqueo_error'));
            })
            .finally(() => {
                setLoadingArqueo(false);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, sesionId]);

    const moneda = arqueo?.moneda ?? 'PEN';
    const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-PE';

    const diferenciaLive = useMemo(() => {
        if (!arqueo) {
            return null;
        }

        const esperado = Number(arqueo.efectivo_esperado);
        const contado = Number(data.saldo_cierre_efectivo);
        if (
            Number.isNaN(esperado) ||
            Number.isNaN(contado) ||
            data.saldo_cierre_efectivo.trim() === ''
        ) {
            return null;
        }

        return (contado - esperado).toFixed(2);
    }, [arqueo, data.saldo_cierre_efectivo]);

    const diffTone =
        diferenciaLive === null
            ? 'muted'
            : Number(diferenciaLive) === 0
              ? 'ok'
              : Number(diferenciaLive) > 0
                ? 'over'
                : 'short';

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        post(caja.cerrar().url, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                reset();
                clearErrors();
                setArqueo(null);
            },
            onError: (formErrors) => {
                const message = Object.values(formErrors).find(
                    (value): value is string =>
                        typeof value === 'string' && value.trim() !== '',
                );

                toastManager.error({
                    title: message ?? t('sesiones.dialog_cerrar.submit_error'),
                });
            },
        });
    };

    return (
        <FormModal
            open={open && sesionId !== null}
            onOpenChange={onOpenChange}
            size="lg"
            title={t('sesiones.dialog_cerrar.title')}
            description={t('sesiones.dialog_cerrar.description')}
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('sesiones.dialog_cerrar.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !sesionId || loadingArqueo}
                        className="cursor-pointer gap-2"
                    >
                        {processing ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                            />
                        ) : null}
                        {t('sesiones.dialog_cerrar.submit')}
                    </Button>
                </>
            }
        >
            <div className="flex w-full min-w-0 flex-col gap-5">
                {Object.values(errors).some(
                    (value) => typeof value === 'string' && value.trim() !== '',
                ) ? (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <span>
                            {Object.values(errors).find(
                                (value): value is string =>
                                    typeof value === 'string' &&
                                    value.trim() !== '',
                            )}
                        </span>
                    </div>
                ) : null}

                {loadingArqueo ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        {t('sesiones.dialog_cerrar.loading_arqueo')}
                    </div>
                ) : null}

                {arqueoError ? (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <span>{arqueoError}</span>
                    </div>
                ) : null}

                {arqueo ? (
                    <ArqueoResumen
                        arqueo={arqueo}
                        diferenciaOverride={diferenciaLive}
                        diffTone={diffTone}
                        billeterasContadas={data.saldos_cierre}
                    />
                ) : null}

                <FormField
                    id="cerrar-saldo"
                    label={t('sesiones.fields.saldo_cierre')}
                    error={errors.saldo_cierre_efectivo}
                    hint={t('sesiones.dialog_cerrar.contado_hint')}
                >
                    <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={data.saldo_cierre_efectivo}
                        onChange={(ev) =>
                            setData('saldo_cierre_efectivo', ev.target.value)
                        }
                        className="h-11 text-base font-semibold tabular-nums"
                        autoFocus
                    />
                </FormField>

                <BilleterasMontosFields
                    idPrefix="cerrar-billetera"
                    values={data.saldos_cierre}
                    errorPrefix="saldos_cierre"
                    errors={errors as Record<string, string | undefined>}
                    onChange={(codigo, value) =>
                        setData('saldos_cierre', {
                            ...data.saldos_cierre,
                            [codigo]: value,
                        })
                    }
                />

                <FormField
                    id="cerrar-notas"
                    label={t('sesiones.fields.notas_cierre')}
                    error={errors.notas}
                >
                    <Textarea
                        value={data.notas}
                        onChange={(ev) => setData('notas', ev.target.value)}
                        rows={2}
                        className="resize-y"
                        placeholder={t(
                            'sesiones.dialog_cerrar.notas_placeholder',
                        )}
                    />
                </FormField>

                {arqueo && data.saldo_cierre_efectivo.trim() !== '' ? (
                    <p className="sr-only">
                        {formatArqueoMoney(diferenciaLive, moneda, locale)}
                    </p>
                ) : null}
            </div>
        </FormModal>
    );
}

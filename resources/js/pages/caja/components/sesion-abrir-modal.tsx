import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toastManager } from '@/lib/toast';
import caja from '../caja-routes';
import { BilleterasMontosFields } from './billeteras-montos-fields';
import {
    emptySaldosBilleteras,
    type CajaBilleteraCodigo,
    type SaldosBilleterasForm,
} from './billeteras-types';

type SesionAbrirModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

type FormData = {
    moneda: string;
    monto_apertura: string;
    saldos_apertura: SaldosBilleterasForm;
    notas: string;
};

const emptyForm = (): FormData => ({
    moneda: 'PEN',
    monto_apertura: '0',
    saldos_apertura: emptySaldosBilleteras('0'),
    notas: '',
});

export function SesionAbrirModal({
    open,
    onOpenChange,
}: SesionAbrirModalProps) {
    const { t } = useTranslation(['caja', 'common']);
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FormData>(emptyForm);
    const wasOpenRef = useRef(false);

    useEffect(() => {
        if (open && !wasOpenRef.current) {
            reset();
            clearErrors();
            setData(emptyForm());
        }
        wasOpenRef.current = open;
    }, [open, reset, clearErrors, setData]);

    function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        post(caja.abrir().url, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                reset();
                clearErrors();
            },
            onError: (formErrors) => {
                const message =
                    formErrors.caja ??
                    formErrors.monto_apertura ??
                    formErrors.moneda ??
                    formErrors.notas ??
                    formErrors['saldos_apertura.yape'] ??
                    formErrors['saldos_apertura.plin'] ??
                    formErrors['saldos_apertura.transferencia'] ??
                    formErrors['saldos_apertura.agora'] ??
                    formErrors['saldos_apertura.sip'];
                if (message) {
                    toastManager.error({ title: message });
                }
            },
        });
    }

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={t('abrir.title')}
            description={t('abrir.description')}
            size="md"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common:actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing}
                        className="cursor-pointer gap-2"
                    >
                        {processing ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                            />
                        ) : null}
                        {t('abrir.submit')}
                    </Button>
                </>
            }
        >
            <div className="flex w-full min-w-0 flex-col gap-4">
                <FormField
                    id="abrir-moneda"
                    label={t('abrir.moneda')}
                    error={errors.moneda}
                >
                    <Select
                        value={data.moneda}
                        onValueChange={(v) => setData('moneda', v)}
                    >
                        <SelectTrigger className="h-9 w-full min-w-0 cursor-pointer justify-between">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PEN">PEN</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField
                    id="abrir-efectivo"
                    label={t('abrir.efectivo')}
                    error={errors.monto_apertura}
                >
                    <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={data.monto_apertura}
                        onChange={(ev) =>
                            setData('monto_apertura', ev.target.value)
                        }
                        className="tabular-nums"
                    />
                </FormField>

                <BilleterasMontosFields
                    idPrefix="abrir-billetera"
                    values={data.saldos_apertura}
                    errorPrefix="saldos_apertura"
                    errors={errors as Record<string, string | undefined>}
                    onChange={(codigo: CajaBilleteraCodigo, value) =>
                        setData('saldos_apertura', {
                            ...data.saldos_apertura,
                            [codigo]: value,
                        })
                    }
                />

                <FormField
                    id="abrir-notas"
                    label={t('abrir.notas')}
                    error={errors.notas}
                >
                    <Textarea
                        value={data.notas}
                        onChange={(ev) => setData('notas', ev.target.value)}
                        rows={3}
                        className="resize-y"
                    />
                </FormField>
            </div>
        </FormModal>
    );
}

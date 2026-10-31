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

type SesionEgresoModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    motivos: string[];
    medios: string[];
};

type FormData = {
    monto: string;
    medio: string;
    motivo: string;
    notas: string;
};

const emptyForm = (medios: string[], motivos: string[]): FormData => ({
    monto: '',
    medio: medios.includes('efectivo') ? 'efectivo' : (medios[0] ?? 'efectivo'),
    motivo: motivos.includes('insumos') ? 'insumos' : (motivos[0] ?? 'otros'),
    notas: '',
});

export function SesionEgresoModal({
    open,
    onOpenChange,
    motivos,
    medios,
}: SesionEgresoModalProps) {
    const { t } = useTranslation(['caja', 'common']);
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FormData>(() => emptyForm(medios, motivos));
    const wasOpenRef = useRef(false);

    useEffect(() => {
        if (open && !wasOpenRef.current) {
            reset();
            clearErrors();
            setData(emptyForm(medios, motivos));
        }
        wasOpenRef.current = open;
    }, [open, medios, motivos, reset, clearErrors, setData]);

    function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        post(caja.egresos.store().url, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                reset();
                clearErrors();
            },
            onError: (formErrors) => {
                const message = Object.values(formErrors).find(
                    (v): v is string => typeof v === 'string' && v.trim() !== '',
                );
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
            title={t('egreso.registrar')}
            description={t('egreso.description')}
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
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : null}
                        {t('egreso.guardar')}
                    </Button>
                </>
            }
        >
            <div className="flex w-full min-w-0 flex-col gap-4">
                <FormField id="egreso-monto" label={t('egreso.monto')} error={errors.monto}>
                    <Input
                        type="number"
                        inputMode="decimal"
                        min={0.01}
                        step="0.01"
                        value={data.monto}
                        onChange={(ev) => setData('monto', ev.target.value)}
                        className="tabular-nums"
                        autoFocus
                    />
                </FormField>
                <FormField id="egreso-motivo" label={t('egreso.motivo')} error={errors.motivo}>
                    <Select
                        value={data.motivo}
                        onValueChange={(v) => setData('motivo', v)}
                    >
                        <SelectTrigger className="h-9 w-full cursor-pointer">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {motivos.map((m) => (
                                <SelectItem key={m} value={m}>
                                    {t(`egreso.motivos.${m}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField id="egreso-medio" label={t('egreso.medio')} error={errors.medio}>
                    <Select
                        value={data.medio}
                        onValueChange={(v) => setData('medio', v)}
                    >
                        <SelectTrigger className="h-9 w-full cursor-pointer">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {medios.map((m) => (
                                <SelectItem key={m} value={m}>
                                    {t(`medios.${m}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField id="egreso-notas" label={t('sesion.notas')} error={errors.notas}>
                    <Textarea
                        value={data.notas}
                        onChange={(ev) => setData('notas', ev.target.value)}
                        rows={2}
                        className="resize-y"
                    />
                </FormField>
            </div>
        </FormModal>
    );
}

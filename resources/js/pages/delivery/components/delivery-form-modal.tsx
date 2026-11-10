import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type DeliveryFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

type FormData = {
    cliente_nombre: string;
    comensales: number;
    notas: string;
};

export function DeliveryFormModal({ open, onOpenChange }: DeliveryFormModalProps) {
    const { t } = useTranslation(['delivery', 'common']);
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            cliente_nombre: '',
            comensales: 1,
            notas: '',
        });

    useEffect(() => {
        if (!open) {
            return;
        }
        clearErrors();
        reset();
        setData({
            cliente_nombre: '',
            comensales: 1,
            notas: '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const canSubmit = useMemo(() => {
        if (processing) {
            return false;
        }
        if (data.cliente_nombre.trim().length < 2) {
            return false;
        }
        return data.comensales >= 1 && data.comensales <= 99;
    }, [processing, data.cliente_nombre, data.comensales]);

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }
        post('/delivery', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={t('delivery:form.title')}
            description={t('delivery:form.description')}
            size="sm"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={processing}
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer"
                    >
                        {t('common:actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                    >
                        {processing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        {t('delivery:form.submit')}
                    </Button>
                </>
            }
        >
            <FormSection index={0} title={t('delivery:form.section')}>
                <FormField
                    id="delivery-cliente"
                    label={t('delivery:form.cliente')}
                    error={errors.cliente_nombre}
                    required
                >
                    <Input
                        id="delivery-cliente"
                        value={data.cliente_nombre}
                        onChange={(e) =>
                            setData('cliente_nombre', e.target.value)
                        }
                        placeholder={t('delivery:form.cliente_placeholder')}
                        autoFocus
                    />
                </FormField>
                <FormField
                    id="delivery-comensales"
                    label={t('delivery:form.comensales')}
                    error={errors.comensales}
                    required
                >
                    <Input
                        id="delivery-comensales"
                        type="number"
                        min={1}
                        max={99}
                        value={data.comensales}
                        onChange={(e) =>
                            setData(
                                'comensales',
                                Number(e.target.value) || 1,
                            )
                        }
                    />
                </FormField>
                <FormField
                    id="delivery-notas"
                    label={t('delivery:form.notas')}
                    error={errors.notas}
                    hint={t('delivery:form.notas_hint')}
                >
                    <Textarea
                        id="delivery-notas"
                        value={data.notas}
                        onChange={(e) => setData('notas', e.target.value)}
                        rows={3}
                        placeholder={t('delivery:form.notas_placeholder')}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}

import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal, FormSection } from '@/components/forms';
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

export type DeliveryZonaOption = {
    id: string;
    nombre: string;
    tarifa: string | number;
    activa: boolean;
};

type DeliveryFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    zonas: DeliveryZonaOption[];
};

type FormData = {
    cliente_nombre: string;
    telefono: string;
    direccion: string;
    zona_id: string;
    comensales: number;
    notas: string;
};

export function DeliveryFormModal({
    open,
    onOpenChange,
    zonas,
}: DeliveryFormModalProps) {
    const { t } = useTranslation(['delivery', 'common']);
    const activas = useMemo(
        () => zonas.filter((z) => z.activa),
        [zonas],
    );
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            cliente_nombre: '',
            telefono: '',
            direccion: '',
            zona_id: '',
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
            telefono: '',
            direccion: '',
            zona_id: '',
            comensales: 1,
            notas: '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const tarifaZona = useMemo(() => {
        const z = activas.find((x) => x.id === data.zona_id);
        return z ? Number(z.tarifa) : 0;
    }, [activas, data.zona_id]);

    const canSubmit = useMemo(() => {
        if (processing) {
            return false;
        }
        if (data.cliente_nombre.trim().length < 2) {
            return false;
        }
        if (data.direccion.trim().length < 3) {
            return false;
        }
        return data.comensales >= 1 && data.comensales <= 99;
    }, [
        processing,
        data.cliente_nombre,
        data.direccion,
        data.comensales,
    ]);

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
            size="md"
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
                    id="delivery-telefono"
                    label={t('delivery:form.telefono')}
                    error={errors.telefono}
                >
                    <Input
                        id="delivery-telefono"
                        type="tel"
                        value={data.telefono}
                        onChange={(e) => setData('telefono', e.target.value)}
                        placeholder={t('delivery:form.telefono_placeholder')}
                    />
                </FormField>
                <FormField
                    id="delivery-direccion"
                    label={t('delivery:form.direccion')}
                    error={errors.direccion}
                    required
                    className="sm:col-span-2"
                >
                    <Input
                        id="delivery-direccion"
                        value={data.direccion}
                        onChange={(e) => setData('direccion', e.target.value)}
                        placeholder={t('delivery:form.direccion_placeholder')}
                    />
                </FormField>
                <FormField
                    id="delivery-zona"
                    label={t('delivery:form.zona')}
                    error={errors.zona_id}
                    hint={
                        tarifaZona > 0
                            ? t('delivery:form.zona_tarifa', {
                                  tarifa: tarifaZona.toFixed(2),
                              })
                            : t('delivery:form.zona_hint')
                    }
                    className="sm:col-span-2"
                >
                    <Select
                        value={data.zona_id || '__none__'}
                        onValueChange={(v) =>
                            setData('zona_id', v === '__none__' ? '' : v)
                        }
                    >
                        <SelectTrigger id="delivery-zona">
                            <SelectValue
                                placeholder={t('delivery:form.zona_placeholder')}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">
                                {t('delivery:form.zona_none')}
                            </SelectItem>
                            {activas.map((z) => (
                                <SelectItem key={z.id} value={z.id}>
                                    {z.nombre} · S/{' '}
                                    {Number(z.tarifa).toFixed(2)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                    className="sm:col-span-2"
                >
                    <Textarea
                        id="delivery-notas"
                        value={data.notas}
                        onChange={(e) => setData('notas', e.target.value)}
                        rows={2}
                        placeholder={t('delivery:form.notas_placeholder')}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}

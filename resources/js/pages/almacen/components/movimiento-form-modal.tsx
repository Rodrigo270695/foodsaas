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
import almacen from '../almacen-routes';
import type { AlmacenProducto } from '../types';

const TIPOS = ['entrada', 'salida', 'ajuste', 'merma', 'venta'] as const;

type MovimientoFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    producto: AlmacenProducto | null;
};

type FormData = {
    tipo: (typeof TIPOS)[number];
    cantidad: string;
    stock_nuevo: string;
    motivo: string;
};

export function MovimientoFormModal({
    open,
    onOpenChange,
    producto,
}: MovimientoFormModalProps) {
    const { t } = useTranslation(['almacen', 'common']);
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            tipo: 'entrada',
            cantidad: '',
            stock_nuevo: '',
            motivo: '',
        });

    useEffect(() => {
        if (open) {
            reset();
            clearErrors();
            setData({
                tipo: 'entrada',
                cantidad: '',
                stock_nuevo: producto?.stock ?? '0',
                motivo: '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, producto?.id]);

    const isAjuste = data.tipo === 'ajuste';
    const canSubmit = useMemo(() => {
        if (!producto || processing) {
            return false;
        }
        if (isAjuste) {
            return data.stock_nuevo.trim() !== '' && !Number.isNaN(Number(data.stock_nuevo));
        }
        return (
            data.cantidad.trim() !== '' &&
            Number(data.cantidad) > 0 &&
            !Number.isNaN(Number(data.cantidad))
        );
    }, [producto, processing, isAjuste, data.stock_nuevo, data.cantidad]);

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!producto) {
            return;
        }

        post(almacen.movimientos.store(producto.id).url, {
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
            title={t('movimiento_form.title')}
            description={
                producto
                    ? t('movimiento_form.description', { name: producto.nombre })
                    : undefined
            }
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                        className="cursor-pointer"
                    >
                        {t('common:actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="cursor-pointer gap-2"
                    >
                        {processing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        {t('movimiento_form.submit')}
                    </Button>
                </>
            }
        >
            {producto ? (
                <p className="mb-3 text-sm text-muted-foreground">
                    {t('movimiento_form.stock_actual', {
                        stock: producto.stock ?? '0',
                    })}
                </p>
            ) : null}

            <FormSection index={0} title={t('movimiento_form.title')} columns={2}>
                <FormField
                    id="mov-tipo"
                    label={t('movimiento_form.fields.tipo')}
                    required
                    error={errors.tipo}
                >
                    <Select
                        value={data.tipo}
                        onValueChange={(v) =>
                            setData('tipo', v as FormData['tipo'])
                        }
                    >
                        <SelectTrigger id="mov-tipo" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TIPOS.map((tipo) => (
                                <SelectItem key={tipo} value={tipo}>
                                    {t(`movimiento_form.tipos.${tipo}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                {isAjuste ? (
                    <FormField
                        id="mov-stock-nuevo"
                        label={t('movimiento_form.fields.stock_nuevo')}
                        required
                        error={errors.stock_nuevo}
                    >
                        <Input
                            id="mov-stock-nuevo"
                            type="number"
                            min={0}
                            step="0.001"
                            value={data.stock_nuevo}
                            onChange={(e) =>
                                setData('stock_nuevo', e.target.value)
                            }
                        />
                    </FormField>
                ) : (
                    <FormField
                        id="mov-cantidad"
                        label={t('movimiento_form.fields.cantidad')}
                        required
                        error={errors.cantidad}
                    >
                        <Input
                            id="mov-cantidad"
                            type="number"
                            min={0}
                            step="0.001"
                            value={data.cantidad}
                            onChange={(e) => setData('cantidad', e.target.value)}
                        />
                    </FormField>
                )}

                <FormField
                    id="mov-motivo"
                    label={t('movimiento_form.fields.motivo')}
                    error={errors.motivo}
                    className="sm:col-span-2"
                >
                    <Input
                        id="mov-motivo"
                        value={data.motivo}
                        onChange={(e) => setData('motivo', e.target.value)}
                        placeholder={t(
                            'movimiento_form.fields.motivo_placeholder',
                        )}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}

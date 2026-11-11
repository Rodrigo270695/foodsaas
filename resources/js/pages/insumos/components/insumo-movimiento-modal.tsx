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
import insumos from '../insumos-routes';
import type { InsumoRow } from '../types';

const TIPOS = ['entrada', 'salida', 'ajuste', 'merma'] as const;

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    insumo: InsumoRow | null;
};

type FormData = {
    tipo: (typeof TIPOS)[number];
    cantidad: string;
    stock_nuevo: string;
    motivo: string;
    costo_unitario: string;
};

export function InsumoMovimientoModal({ open, onOpenChange, insumo }: Props) {
    const { t } = useTranslation(['insumos', 'common', 'almacen']);
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            tipo: 'entrada',
            cantidad: '',
            stock_nuevo: '',
            motivo: '',
            costo_unitario: '',
        });

    useEffect(() => {
        if (!open) {
            return;
        }
        clearErrors();
        setData({
            tipo: 'entrada',
            cantidad: '',
            stock_nuevo: insumo?.stock ?? '0',
            motivo: '',
            costo_unitario: insumo?.costo_unitario ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, insumo?.id]);

    const isAjuste = data.tipo === 'ajuste';
    const canSubmit = useMemo(() => {
        if (!insumo || processing) {
            return false;
        }
        if (isAjuste) {
            return (
                data.stock_nuevo.trim() !== '' &&
                !Number.isNaN(Number(data.stock_nuevo))
            );
        }
        return (
            data.cantidad.trim() !== '' &&
            Number(data.cantidad) > 0 &&
            !Number.isNaN(Number(data.cantidad))
        );
    }, [insumo, processing, isAjuste, data.stock_nuevo, data.cantidad]);

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!insumo) {
            return;
        }
        post(insumos.movimientos.store(insumo.id).url, {
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
            title={t('movimiento.title')}
            description={t('movimiento.description')}
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
                        {t('movimiento.submit')}
                    </Button>
                </>
            }
        >
            {insumo ? (
                <p className="mb-3 text-sm text-muted-foreground">
                    {insumo.nombre} · {insumo.stock} {insumo.unidad}
                </p>
            ) : null}

            <FormSection index={0} title={t('movimiento.title')} columns={2}>
                <FormField
                    id="ins-mov-tipo"
                    label={t('movimiento.tipo')}
                    required
                    error={errors.tipo}
                >
                    <Select
                        value={data.tipo}
                        onValueChange={(v) =>
                            setData('tipo', v as FormData['tipo'])
                        }
                    >
                        <SelectTrigger id="ins-mov-tipo" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TIPOS.map((tipo) => (
                                <SelectItem key={tipo} value={tipo}>
                                    {t(`almacen:movimiento_form.tipos.${tipo}`, {
                                        defaultValue: tipo,
                                    })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                {isAjuste ? (
                    <FormField
                        id="ins-mov-stock"
                        label={t('movimiento.stock_nuevo')}
                        required
                        error={errors.stock_nuevo}
                    >
                        <Input
                            id="ins-mov-stock"
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
                        id="ins-mov-cantidad"
                        label={t('movimiento.cantidad')}
                        required
                        error={errors.cantidad}
                    >
                        <Input
                            id="ins-mov-cantidad"
                            type="number"
                            min={0}
                            step="0.001"
                            value={data.cantidad}
                            onChange={(e) =>
                                setData('cantidad', e.target.value)
                            }
                        />
                    </FormField>
                )}

                {data.tipo === 'entrada' ? (
                    <FormField
                        id="ins-mov-costo"
                        label={t('movimiento.costo_unitario')}
                        error={errors.costo_unitario}
                    >
                        <Input
                            id="ins-mov-costo"
                            type="number"
                            min={0}
                            step="0.0001"
                            value={data.costo_unitario}
                            onChange={(e) =>
                                setData('costo_unitario', e.target.value)
                            }
                        />
                    </FormField>
                ) : null}

                <FormField
                    id="ins-mov-motivo"
                    label={t('movimiento.motivo')}
                    error={errors.motivo}
                    className="sm:col-span-2"
                >
                    <Input
                        id="ins-mov-motivo"
                        value={data.motivo}
                        onChange={(e) => setData('motivo', e.target.value)}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}

import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    insumo: InsumoRow | null;
    unidades: readonly string[];
};

type FormData = {
    nombre: string;
    unidad: string;
    stock: string;
    stock_minimo: string;
    costo_unitario: string;
    activo: boolean;
};

export function InsumoFormModal({
    open,
    onOpenChange,
    insumo,
    unidades,
}: Props) {
    const { t } = useTranslation(['insumos', 'common']);
    const isEdit = insumo !== null;

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            nombre: '',
            unidad: unidades[0] ?? 'und',
            stock: '0',
            stock_minimo: '',
            costo_unitario: '0',
            activo: true,
        });

    useEffect(() => {
        if (!open) {
            return;
        }
        clearErrors();
        setData({
            nombre: insumo?.nombre ?? '',
            unidad: insumo?.unidad ?? unidades[0] ?? 'und',
            stock: '0',
            stock_minimo: insumo?.stock_minimo ?? '',
            costo_unitario: insumo?.costo_unitario ?? '0',
            activo: insumo?.activo ?? true,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, insumo?.id]);

    const canSubmit = useMemo(() => {
        if (processing) {
            return false;
        }
        if (data.nombre.trim().length < 1) {
            return false;
        }
        const costo = Number(data.costo_unitario);
        return !Number.isNaN(costo) && costo >= 0;
    }, [processing, data.nombre, data.costo_unitario]);

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        };
        if (isEdit && insumo) {
            put(insumos.update(insumo.id).url, opts);
            return;
        }
        post(insumos.store().url, opts);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? t('form.edit') : t('form.create')}
            description={t('form.description')}
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
                        {isEdit
                            ? t('form.submit_edit')
                            : t('form.submit_create')}
                    </Button>
                </>
            }
        >
            <FormSection index={0} title={t('form.section')} columns={2}>
                <FormField
                    id="insumo-nombre"
                    label={t('form.nombre')}
                    required
                    error={errors.nombre}
                    className="sm:col-span-2"
                >
                    <Input
                        id="insumo-nombre"
                        value={data.nombre}
                        placeholder={t('form.nombre_placeholder')}
                        onChange={(e) => setData('nombre', e.target.value)}
                        autoComplete="off"
                    />
                </FormField>

                <FormField
                    id="insumo-unidad"
                    label={t('form.unidad')}
                    required
                    error={errors.unidad}
                >
                    <Select
                        value={data.unidad}
                        onValueChange={(v) => setData('unidad', v)}
                    >
                        <SelectTrigger id="insumo-unidad" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {unidades.map((u) => (
                                <SelectItem key={u} value={u}>
                                    {u}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField
                    id="insumo-costo"
                    label={t('form.costo_unitario')}
                    required
                    error={errors.costo_unitario}
                >
                    <Input
                        id="insumo-costo"
                        type="number"
                        min={0}
                        step="0.0001"
                        value={data.costo_unitario}
                        onChange={(e) =>
                            setData('costo_unitario', e.target.value)
                        }
                    />
                </FormField>

                {!isEdit ? (
                    <FormField
                        id="insumo-stock"
                        label={t('form.stock')}
                        error={errors.stock}
                    >
                        <Input
                            id="insumo-stock"
                            type="number"
                            min={0}
                            step="0.001"
                            value={data.stock}
                            onChange={(e) => setData('stock', e.target.value)}
                        />
                    </FormField>
                ) : null}

                <FormField
                    id="insumo-minimo"
                    label={t('form.stock_minimo')}
                    error={errors.stock_minimo}
                >
                    <Input
                        id="insumo-minimo"
                        type="number"
                        min={0}
                        step="0.001"
                        value={data.stock_minimo}
                        onChange={(e) =>
                            setData('stock_minimo', e.target.value)
                        }
                    />
                </FormField>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 sm:col-span-2">
                    <Checkbox
                        id="insumo-activo"
                        checked={data.activo}
                        onCheckedChange={(checked) =>
                            setData('activo', checked === true)
                        }
                        className="mt-0.5"
                    />
                    <span className="text-sm font-medium">
                        {t('form.activo')}
                    </span>
                </label>
            </FormSection>
        </FormModal>
    );
}

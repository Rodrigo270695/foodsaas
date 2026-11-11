import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, type FormEvent } from 'react';
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
import ofertas from '../ofertas-routes';
import type { OfertaRow, OfertaTipo } from '../types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    oferta: OfertaRow | null;
};

type FormData = {
    codigo: string;
    nombre: string;
    tipo: OfertaTipo;
    valor: string;
    tope_monto: string;
    usos_max: string;
    vigente_desde: string;
    vigente_hasta: string;
    activa: boolean;
};

const emptyForm = (): FormData => ({
    codigo: '',
    nombre: '',
    tipo: 'porcentaje',
    valor: '',
    tope_monto: '',
    usos_max: '',
    vigente_desde: '',
    vigente_hasta: '',
    activa: true,
});

const buildInitial = (oferta: OfertaRow | null): FormData => {
    if (!oferta) {
        return emptyForm();
    }

    return {
        codigo: oferta.codigo,
        nombre: oferta.nombre,
        tipo: oferta.tipo,
        valor: String(oferta.valor ?? ''),
        tope_monto:
            oferta.tope_monto !== null && oferta.tope_monto !== undefined
                ? String(oferta.tope_monto)
                : '',
        usos_max:
            oferta.usos_max !== null && oferta.usos_max !== undefined
                ? String(oferta.usos_max)
                : '',
        vigente_desde: oferta.vigente_desde ?? '',
        vigente_hasta: oferta.vigente_hasta ?? '',
        activa: oferta.activa,
    };
};

const isFormValid = (data: FormData): boolean => {
    if (data.codigo.trim().length < 2) {
        return false;
    }
    if (data.nombre.trim().length < 2) {
        return false;
    }
    const valor = Number(String(data.valor).replace(',', '.'));
    if (!Number.isFinite(valor) || valor <= 0) {
        return false;
    }
    if (data.tipo === 'porcentaje' && valor > 100) {
        return false;
    }
    if (
        data.vigente_desde &&
        data.vigente_hasta &&
        data.vigente_desde > data.vigente_hasta
    ) {
        return false;
    }

    return true;
};

export function OfertaFormModal({ open, onOpenChange, oferta }: Props) {
    const { t } = useTranslation(['ofertas', 'common']);
    const isEdit = oferta !== null;
    const { data, setData, post, put, processing, errors, reset, clearErrors, transform } =
        useForm<FormData>(emptyForm());
    const initialSnapshotRef = useRef<FormData>(emptyForm());

    useEffect(() => {
        if (!open) {
            return;
        }
        const initial = buildInitial(oferta);
        initialSnapshotRef.current = initial;
        setData(initial);
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, oferta?.id]);

    const canSubmit = useMemo(
        () => isFormValid(data) && !processing,
        [data, processing],
    );

    const isDirty = useMemo(() => {
        const initial = initialSnapshotRef.current;
        return JSON.stringify(initial) !== JSON.stringify(data);
    }, [data]);

    const handleClose = (next: boolean) => {
        if (!next) {
            if (isDirty && !window.confirm(t('common:form.unsaved_changes'))) {
                return;
            }
            reset();
            clearErrors();
        }
        onOpenChange(next);
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }

        transform((current) => ({
            codigo: current.codigo.trim().toUpperCase(),
            nombre: current.nombre.trim(),
            tipo: current.tipo,
            valor: Number(String(current.valor).replace(',', '.')),
            tope_monto:
                current.tope_monto.trim() !== ''
                    ? Number(String(current.tope_monto).replace(',', '.'))
                    : null,
            usos_max:
                current.usos_max.trim() !== ''
                    ? Number(current.usos_max)
                    : null,
            vigente_desde: current.vigente_desde || null,
            vigente_hasta: current.vigente_hasta || null,
            activa: current.activa,
        }));

        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                clearErrors();
                onOpenChange(false);
            },
        };

        if (isEdit && oferta) {
            put(ofertas.update(oferta.id).url, opts);
            return;
        }

        post(ofertas.store().url, opts);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={handleClose}
            title={
                isEdit
                    ? t('ofertas:form.title_edit')
                    : t('ofertas:form.title_create')
            }
            description={
                isEdit
                    ? t('ofertas:form.description_edit')
                    : t('ofertas:form.description_create')
            }
            size="lg"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleClose(false)}
                        disabled={processing}
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
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                            />
                        ) : null}
                        {isEdit
                            ? t('ofertas:form.submit_edit')
                            : t('ofertas:form.submit_create')}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection
                    index={0}
                    title={t('ofertas:form.section_basic')}
                    description={t('ofertas:form.section_basic_hint')}
                    columns={2}
                >
                    <FormField
                        id="oferta-codigo"
                        label={t('ofertas:fields.codigo')}
                        error={errors.codigo}
                        required
                    >
                        <Input
                            id="oferta-codigo"
                            value={data.codigo}
                            onChange={(e) =>
                                setData(
                                    'codigo',
                                    e.target.value.toUpperCase(),
                                )
                            }
                            placeholder={t('ofertas:fields.codigo_placeholder')}
                            className="uppercase"
                            maxLength={40}
                            autoFocus
                        />
                    </FormField>
                    <FormField
                        id="oferta-nombre"
                        label={t('ofertas:fields.nombre')}
                        error={errors.nombre}
                        required
                    >
                        <Input
                            id="oferta-nombre"
                            value={data.nombre}
                            onChange={(e) =>
                                setData('nombre', e.target.value)
                            }
                            placeholder={t(
                                'ofertas:fields.nombre_placeholder',
                            )}
                            maxLength={150}
                        />
                    </FormField>
                    <FormField
                        id="oferta-tipo"
                        label={t('ofertas:fields.tipo')}
                        required
                    >
                        <Select
                            value={data.tipo}
                            onValueChange={(v) =>
                                setData('tipo', v as OfertaTipo)
                            }
                        >
                            <SelectTrigger id="oferta-tipo">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="porcentaje">
                                    {t('ofertas:tipos.porcentaje')}
                                </SelectItem>
                                <SelectItem value="monto">
                                    {t('ofertas:tipos.monto')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </FormField>
                    <FormField
                        id="oferta-valor"
                        label={t('ofertas:fields.valor')}
                        error={errors.valor}
                        hint={
                            data.tipo === 'porcentaje'
                                ? t('ofertas:fields.valor_hint_pct')
                                : t('ofertas:fields.valor_hint_monto')
                        }
                        required
                    >
                        <Input
                            id="oferta-valor"
                            type="number"
                            min={0.01}
                            max={data.tipo === 'porcentaje' ? 100 : undefined}
                            step="0.01"
                            value={data.valor}
                            onChange={(e) => setData('valor', e.target.value)}
                        />
                    </FormField>
                </FormSection>

                <FormSection
                    index={1}
                    title={t('ofertas:form.section_limits')}
                    description={t('ofertas:form.section_limits_hint')}
                    columns={2}
                >
                    <FormField
                        id="oferta-tope"
                        label={t('ofertas:fields.tope')}
                        error={errors.tope_monto}
                    >
                        <Input
                            id="oferta-tope"
                            type="number"
                            min={0}
                            step="0.01"
                            value={data.tope_monto}
                            onChange={(e) =>
                                setData('tope_monto', e.target.value)
                            }
                            placeholder="0.00"
                        />
                    </FormField>
                    <FormField
                        id="oferta-usos"
                        label={t('ofertas:fields.usos_max')}
                        error={errors.usos_max}
                    >
                        <Input
                            id="oferta-usos"
                            type="number"
                            min={1}
                            step={1}
                            value={data.usos_max}
                            onChange={(e) =>
                                setData('usos_max', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        id="oferta-desde"
                        label={t('ofertas:fields.desde')}
                        error={errors.vigente_desde}
                    >
                        <Input
                            id="oferta-desde"
                            type="date"
                            value={data.vigente_desde}
                            onChange={(e) =>
                                setData('vigente_desde', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        id="oferta-hasta"
                        label={t('ofertas:fields.hasta')}
                        error={errors.vigente_hasta}
                    >
                        <Input
                            id="oferta-hasta"
                            type="date"
                            value={data.vigente_hasta}
                            onChange={(e) =>
                                setData('vigente_hasta', e.target.value)
                            }
                        />
                    </FormField>
                    <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border/60 p-3 sm:col-span-2">
                        <Checkbox
                            checked={data.activa}
                            onCheckedChange={(v) =>
                                setData('activa', v === true)
                            }
                            className="mt-0.5"
                        />
                        <span className="text-sm">
                            <span className="font-medium">
                                {t('ofertas:fields.activa')}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                                {t('ofertas:form.activa_hint')}
                            </span>
                        </span>
                    </label>
                </FormSection>
            </div>
        </FormModal>
    );
}

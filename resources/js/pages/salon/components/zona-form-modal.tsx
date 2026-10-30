import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal, FormSection, SedeFormField } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import salon from '../salon-routes';
import type { SedeOpcion, ZonaSalon } from '../types';

export type ZonaFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    zona: ZonaSalon | null;
    sedes: readonly SedeOpcion[];
    defaultSedeId: string;
};

type ZonaFormData = {
    sede_id: string;
    nombre: string;
    orden: number;
    activa: boolean;
};

const buildInitialData = (
    zona: ZonaSalon | null,
    defaultSedeId: string,
): ZonaFormData => ({
    sede_id: zona?.sede_id ?? defaultSedeId,
    nombre: zona?.nombre ?? '',
    orden: zona?.orden ?? 0,
    activa: zona?.activa ?? true,
});

const isFormValid = (data: ZonaFormData): boolean =>
    data.nombre.trim().length > 0 && data.sede_id.trim().length > 0;

export function ZonaFormModal({
    open,
    onOpenChange,
    zona,
    sedes,
    defaultSedeId,
}: ZonaFormModalProps) {
    const { t } = useTranslation(['salon', 'common']);
    const isEdit = zona !== null;

    const emptyForm = buildInitialData(null, defaultSedeId);
    const { data, setData, post, patch, processing, errors, reset, clearErrors } =
        useForm<ZonaFormData>(emptyForm);

    const initialSnapshotRef = useRef<ZonaFormData>(emptyForm);
    const canSubmit = isFormValid(data) && !processing;

    useEffect(() => {
        if (open) {
            const initial = buildInitialData(zona, defaultSedeId);
            initialSnapshotRef.current = initial;
            (Object.keys(initial) as Array<keyof ZonaFormData>).forEach((key) => {
                setData(key, initial[key]);
            });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, zona?.id, defaultSedeId]);

    const isDirty = useMemo(() => {
        const initial = initialSnapshotRef.current;
        return (Object.keys(initial) as Array<keyof ZonaFormData>).some(
            (key) => initial[key] !== data[key],
        );
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
        const onSuccess = () => {
            reset();
            clearErrors();
            onOpenChange(false);
        };

        if (isEdit && zona) {
            patch(salon.zonas.update(zona.id).url, {
                preserveScroll: true,
                onSuccess,
            });

            return;
        }

        post(salon.zonas.store().url, {
            preserveScroll: true,
            onSuccess,
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={handleClose}
            title={isEdit ? t('zona_form.title_edit') : t('zona_form.title_create')}
            description={
                isEdit ? t('zona_form.description_edit') : t('zona_form.description_create')
            }
            size="md"
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
                        {processing && (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        )}
                        {isEdit ? t('zona_form.submit_edit') : t('zona_form.submit_create')}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection index={0} title={t('zona_form.section_basic')} columns={2}>
                    <div className="sm:col-span-2">
                        <SedeFormField
                            id="zona-sede"
                            label={t('zona_form.fields.sede')}
                            sedes={sedes}
                            value={data.sede_id}
                            onChange={(id) => setData('sede_id', id ?? '')}
                            error={errors.sede_id}
                            required
                            allowNone={false}
                        />
                    </div>

                    <FormField
                        id="zona-nombre"
                        label={t('zona_form.fields.nombre')}
                        required
                        error={errors.nombre}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="zona-nombre"
                            value={data.nombre}
                            onChange={(e) => setData('nombre', e.target.value)}
                            placeholder={t('zona_form.fields.nombre_placeholder')}
                            autoFocus
                        />
                    </FormField>

                    <FormField
                        id="zona-orden"
                        label={t('zona_form.fields.orden')}
                        error={errors.orden}
                        hint={t('zona_form.fields.orden_hint')}
                    >
                        <Input
                            id="zona-orden"
                            type="number"
                            min={0}
                            max={9999}
                            value={data.orden}
                            onChange={(e) =>
                                setData('orden', Number.parseInt(e.target.value, 10) || 0)
                            }
                        />
                    </FormField>
                </FormSection>

                <FormSection index={1} title={t('zona_form.section_status')}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:bg-muted/30">
                        <Checkbox
                            id="zona-activa"
                            checked={data.activa}
                            onCheckedChange={(checked) =>
                                setData('activa', checked === true)
                            }
                            className="mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">
                                {t('zona_form.fields.activa')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {t('zona_form.fields.activa_hint')}
                            </span>
                        </div>
                    </label>
                    {errors.activa ? (
                        <p className="text-xs text-destructive">{errors.activa}</p>
                    ) : null}
                </FormSection>
            </div>
        </FormModal>
    );
}

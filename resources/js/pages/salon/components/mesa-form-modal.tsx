import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal, FormSection, SedeFormField } from '@/components/forms';
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
import salon from '../salon-routes';
import type { MesaSalon, SedeOpcion, ZonaSalon } from '../types';

export type MesaFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mesa: MesaSalon | null;
    sedes: readonly SedeOpcion[];
    zonas: readonly ZonaSalon[];
    defaultSedeId: string;
    defaultZonaId?: string | null;
};

type MesaFormData = {
    sede_id: string;
    zona_id: string;
    codigo: string;
    nombre: string;
    capacidad: number;
    activa: boolean;
};

const buildInitialData = (
    mesa: MesaSalon | null,
    defaultSedeId: string,
    defaultZonaId: string,
): MesaFormData => ({
    sede_id: mesa?.sede_id ?? defaultSedeId,
    zona_id: mesa?.zona_id ?? defaultZonaId,
    codigo: mesa?.codigo ?? '',
    nombre: mesa?.nombre ?? '',
    capacidad: mesa?.capacidad ?? 2,
    activa: mesa?.activa ?? true,
});

const isFormValid = (data: MesaFormData): boolean =>
    data.codigo.trim().length > 0 &&
    data.sede_id.trim().length > 0 &&
    data.zona_id.trim().length > 0 &&
    data.capacidad >= 1;

export function MesaFormModal({
    open,
    onOpenChange,
    mesa,
    sedes,
    zonas,
    defaultSedeId,
    defaultZonaId = null,
}: MesaFormModalProps) {
    const { t } = useTranslation(['salon', 'common']);
    const isEdit = mesa !== null;

    const fallbackZona =
        defaultZonaId ??
        zonas.find((z) => z.activa)?.id ??
        zonas[0]?.id ??
        '';

    const emptyForm = buildInitialData(null, defaultSedeId, fallbackZona);
    const { data, setData, post, patch, processing, errors, reset, clearErrors } =
        useForm<MesaFormData>(emptyForm);

    const initialSnapshotRef = useRef<MesaFormData>(emptyForm);
    const zonasForSede = useMemo(
        () => zonas.filter((z) => z.sede_id === data.sede_id),
        [zonas, data.sede_id],
    );

    useEffect(() => {
        if (
            open &&
            data.sede_id &&
            zonasForSede.length > 0 &&
            !zonasForSede.some((z) => z.id === data.zona_id)
        ) {
            setData('zona_id', zonasForSede[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.sede_id, open, zonasForSede]);

    const canSubmit =
        isFormValid(data) && !processing && zonasForSede.length > 0;

    useEffect(() => {
        if (open) {
            const initial = buildInitialData(mesa, defaultSedeId, fallbackZona);
            initialSnapshotRef.current = initial;
            (Object.keys(initial) as Array<keyof MesaFormData>).forEach((key) => {
                setData(key, initial[key]);
            });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, mesa?.id, defaultSedeId, fallbackZona]);

    const isDirty = useMemo(() => {
        const initial = initialSnapshotRef.current;
        return (Object.keys(initial) as Array<keyof MesaFormData>).some(
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

        if (isEdit && mesa) {
            patch(salon.mesas.update(mesa.id).url, {
                preserveScroll: true,
                onSuccess,
            });

            return;
        }

        post(salon.mesas.store().url, {
            preserveScroll: true,
            onSuccess,
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={handleClose}
            title={isEdit ? t('mesa_form.title_edit') : t('mesa_form.title_create')}
            description={
                isEdit ? t('mesa_form.description_edit') : t('mesa_form.description_create')
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
                        {processing && (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        )}
                        {isEdit ? t('mesa_form.submit_edit') : t('mesa_form.submit_create')}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                {(errors as Partial<Record<string, string>>).plan_limit ? (
                    <p
                        className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                        role="alert"
                    >
                        {(errors as Partial<Record<string, string>>).plan_limit}
                    </p>
                ) : null}

                {zonasForSede.length === 0 ? (
                    <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                        {t('mesa_form.no_zonas')}
                    </p>
                ) : null}

                <FormSection index={0} title={t('mesa_form.section_basic')} columns={2}>
                    <div className="sm:col-span-2">
                        <SedeFormField
                            id="mesa-sede"
                            label={t('mesa_form.fields.sede')}
                            sedes={sedes}
                            value={data.sede_id}
                            onChange={(id) => setData('sede_id', id ?? '')}
                            error={errors.sede_id}
                            required
                            allowNone={false}
                        />
                    </div>

                    <FormField
                        id="mesa-zona"
                        label={t('mesa_form.fields.zona')}
                        required
                        error={errors.zona_id}
                        className="sm:col-span-2"
                    >
                        <Select
                            value={data.zona_id || undefined}
                            onValueChange={(v) => setData('zona_id', v)}
                            disabled={processing || zonasForSede.length === 0}
                        >
                            <SelectTrigger id="mesa-zona" className="w-full">
                                <SelectValue
                                    placeholder={t('mesa_form.fields.zona_placeholder')}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {zonasForSede.map((zona) => (
                                    <SelectItem key={zona.id} value={zona.id}>
                                        {zona.nombre}
                                        {!zona.activa ? ` (${t('row.inactive')})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>

                    <FormField
                        id="mesa-codigo"
                        label={t('mesa_form.fields.codigo')}
                        required
                        error={errors.codigo}
                    >
                        <Input
                            id="mesa-codigo"
                            value={data.codigo}
                            onChange={(e) => setData('codigo', e.target.value)}
                            placeholder={t('mesa_form.fields.codigo_placeholder')}
                            autoFocus
                        />
                    </FormField>

                    <FormField
                        id="mesa-capacidad"
                        label={t('mesa_form.fields.capacidad')}
                        required
                        error={errors.capacidad}
                    >
                        <Input
                            id="mesa-capacidad"
                            type="number"
                            min={1}
                            max={99}
                            value={data.capacidad}
                            onChange={(e) =>
                                setData(
                                    'capacidad',
                                    Number.parseInt(e.target.value, 10) || 1,
                                )
                            }
                        />
                    </FormField>

                    <FormField
                        id="mesa-nombre"
                        label={t('mesa_form.fields.nombre')}
                        error={errors.nombre}
                        hint={t('mesa_form.fields.nombre_hint')}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="mesa-nombre"
                            value={data.nombre}
                            onChange={(e) => setData('nombre', e.target.value)}
                            placeholder={t('mesa_form.fields.nombre_placeholder')}
                        />
                    </FormField>
                </FormSection>

                <FormSection index={1} title={t('mesa_form.section_status')}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:bg-muted/30">
                        <Checkbox
                            id="mesa-activa"
                            checked={data.activa}
                            onCheckedChange={(checked) =>
                                setData('activa', checked === true)
                            }
                            className="mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">
                                {t('mesa_form.fields.activa')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {t('mesa_form.fields.activa_hint')}
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

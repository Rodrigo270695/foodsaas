import { router, useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FormField,
    FormModal,
    FormSection,
    OrdenInput,
    resolveOrdenValue,
    type OrdenValue,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import carta from '../carta-routes';
import type { CategoriaCarta } from '../types';

export type CategoriaFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categoria: CategoriaCarta | null;
    /** Siguiente orden sugerido al crear (1, 2, 3…). */
    suggestedOrden?: number;
};

type CategoriaFormData = {
    nombre: string;
    descripcion: string;
    orden: OrdenValue;
    activa: boolean;
};

const emptyForm = (suggestedOrden: number): CategoriaFormData => ({
    nombre: '',
    descripcion: '',
    orden: suggestedOrden,
    activa: true,
});

const buildInitialData = (
    categoria: CategoriaCarta | null,
    suggestedOrden: number,
): CategoriaFormData => ({
    nombre: categoria?.nombre ?? '',
    descripcion: categoria?.descripcion ?? '',
    orden: categoria ? categoria.orden : suggestedOrden,
    activa: categoria?.activa ?? true,
});

const isFormValid = (data: CategoriaFormData): boolean =>
    data.nombre.trim().length > 0;

export function CategoriaFormModal({
    open,
    onOpenChange,
    categoria,
    suggestedOrden = 1,
}: CategoriaFormModalProps) {
    const { t } = useTranslation(['carta', 'common']);
    const isEdit = categoria !== null;
    const nextOrden = Math.max(1, suggestedOrden);

    const { data, setData, errors, reset, clearErrors } =
        useForm<CategoriaFormData>(emptyForm(nextOrden));
    const [saving, setSaving] = useState(false);

    const initialSnapshotRef = useRef<CategoriaFormData>(emptyForm(nextOrden));
    const canSubmit = isFormValid(data) && !saving;

    useEffect(() => {
        if (open) {
            const initial = buildInitialData(categoria, nextOrden);
            initialSnapshotRef.current = initial;
            (Object.keys(initial) as Array<keyof CategoriaFormData>).forEach(
                (key) => {
                    setData(key, initial[key]);
                },
            );
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, categoria?.id, nextOrden]);

    const isDirty = useMemo(() => {
        const initial = initialSnapshotRef.current;
        return (Object.keys(initial) as Array<keyof CategoriaFormData>).some(
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
        const orden = resolveOrdenValue(
            data.orden,
            isEdit ? (categoria?.orden ?? nextOrden) : nextOrden,
        );
        const body = { ...data, orden };

        const onSuccess = () => {
            reset();
            clearErrors();
            onOpenChange(false);
        };

        const visit = {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess,
        };

        if (isEdit && categoria) {
            router.patch(carta.categorias.update(categoria.id).url, body, visit);
            return;
        }

        router.post(carta.categorias.store().url, body, visit);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={handleClose}
            title={
                isEdit
                    ? t('categoria_form.title_edit')
                    : t('categoria_form.title_create')
            }
            description={
                isEdit
                    ? t('categoria_form.description_edit')
                    : t('categoria_form.description_create')
            }
            size="md"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleClose(false)}
                        disabled={saving}
                        className="cursor-pointer"
                    >
                        {t('common:actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                    >
                        {saving && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {isEdit
                            ? t('categoria_form.submit_edit')
                            : t('categoria_form.submit_create')}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                {(errors as Partial<Record<string, string>>).sede_id ? (
                    <p
                        className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                        role="alert"
                    >
                        {(errors as Partial<Record<string, string>>).sede_id}
                    </p>
                ) : null}
                <FormSection
                    index={0}
                    title={t('categoria_form.section_basic')}
                    columns={2}
                >
                    <FormField
                        id="categoria-nombre"
                        label={t('categoria_form.fields.nombre')}
                        required
                        error={errors.nombre}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="categoria-nombre"
                            value={data.nombre}
                            onChange={(e) => setData('nombre', e.target.value)}
                            placeholder={t(
                                'categoria_form.fields.nombre_placeholder',
                            )}
                            autoFocus
                        />
                    </FormField>

                    <FormField
                        id="categoria-descripcion"
                        label={t('categoria_form.fields.descripcion')}
                        error={errors.descripcion}
                        className="sm:col-span-2"
                    >
                        <Textarea
                            id="categoria-descripcion"
                            value={data.descripcion}
                            onChange={(e) =>
                                setData('descripcion', e.target.value)
                            }
                            rows={2}
                            placeholder={t(
                                'categoria_form.fields.descripcion_placeholder',
                            )}
                        />
                    </FormField>

                    <FormField
                        id="categoria-orden"
                        label={t('categoria_form.fields.orden')}
                        error={errors.orden}
                        hint={t('categoria_form.fields.orden_hint')}
                    >
                        <OrdenInput
                            id="categoria-orden"
                            value={data.orden}
                            fallbackOnEmpty={
                                isEdit
                                    ? (categoria?.orden ?? nextOrden)
                                    : nextOrden
                            }
                            onChange={(v) => setData('orden', v)}
                        />
                    </FormField>
                </FormSection>

                <FormSection index={1} title={t('categoria_form.section_status')}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:bg-muted/30">
                        <Checkbox
                            id="categoria-activa"
                            checked={data.activa}
                            onCheckedChange={(checked) =>
                                setData('activa', checked === true)
                            }
                            className="mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">
                                {t('categoria_form.fields.activa')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {t('categoria_form.fields.activa_hint')}
                            </span>
                        </div>
                    </label>
                    {errors.activa ? (
                        <p className="text-xs text-destructive">
                            {errors.activa}
                        </p>
                    ) : null}
                </FormSection>
            </div>
        </FormModal>
    );
}

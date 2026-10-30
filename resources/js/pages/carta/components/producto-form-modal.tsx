import { router, useForm, usePage } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import carta from '../carta-routes';
import type { AreaCarta, CategoriaCarta, ProductoCarta } from '../types';
import { ProductoImagenUploader } from './producto-imagen-uploader';

export type ProductoFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    producto: ProductoCarta | null;
    categorias: readonly CategoriaCarta[];
    areas: readonly AreaCarta[];
    defaultCategoriaId?: string | null;
};

type ProductoFormData = {
    categoria_id: string;
    area_id: string;
    nombre: string;
    descripcion: string;
    codigo: string;
    precio: string;
    orden: number;
    activo: boolean;
    imagen: File | null;
    clear_imagen: boolean;
};

type FlashProps = {
    flash?: {
        created_area_id?: string | null;
    } | null;
};

const emptyForm = (categoriaId: string): ProductoFormData => ({
    categoria_id: categoriaId,
    area_id: '',
    nombre: '',
    descripcion: '',
    codigo: '',
    precio: '',
    orden: 0,
    activo: true,
    imagen: null,
    clear_imagen: false,
});

const buildInitialData = (
    producto: ProductoCarta | null,
    fallbackCategoriaId: string,
): ProductoFormData => ({
    categoria_id: producto?.categoria_id ?? fallbackCategoriaId,
    area_id: producto?.area_id ?? '',
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    codigo: producto?.codigo ?? '',
    precio: producto?.precio ?? '',
    orden: producto?.orden ?? 0,
    activo: producto?.activo ?? true,
    imagen: null,
    clear_imagen: false,
});

const isFormValid = (data: ProductoFormData): boolean =>
    data.nombre.trim().length > 0 &&
    data.categoria_id.trim().length > 0 &&
    data.precio.trim().length > 0 &&
    !Number.isNaN(Number.parseFloat(data.precio));

export function ProductoFormModal({
    open,
    onOpenChange,
    producto,
    categorias,
    areas,
    defaultCategoriaId = null,
}: ProductoFormModalProps) {
    const { t } = useTranslation(['carta', 'common']);
    const { flash } = usePage<FlashProps>().props;
    const isEdit = producto !== null;
    const fallbackCategoria =
        defaultCategoriaId ??
        categorias.find((c) => c.activa)?.id ??
        categorias[0]?.id ??
        '';

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<ProductoFormData>(emptyForm(fallbackCategoria));

    const initialSnapshotRef = useRef<ProductoFormData>(
        emptyForm(fallbackCategoria),
    );
    const [creatingArea, setCreatingArea] = useState(false);
    const canSubmit =
        isFormValid(data) && !processing && categorias.length > 0;

    useEffect(() => {
        if (open) {
            const initial = buildInitialData(producto, fallbackCategoria);
            initialSnapshotRef.current = initial;
            (Object.keys(initial) as Array<keyof ProductoFormData>).forEach(
                (key) => {
                    setData(key, initial[key]);
                },
            );
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, producto?.id, fallbackCategoria]);

    useEffect(() => {
        const createdId = flash?.created_area_id;
        if (createdId && open) {
            setData('area_id', createdId);
            setCreatingArea(false);
        }
    }, [flash?.created_area_id, open, setData]);

    const areaOptions = useMemo<ComboboxOption[]>(
        () =>
            areas.map((area) => ({
                value: area.id,
                label: area.nombre,
            })),
        [areas],
    );

    const isDirty = useMemo(() => {
        const initial = initialSnapshotRef.current;
        return (Object.keys(initial) as Array<keyof ProductoFormData>).some(
            (key) => {
                if (key === 'imagen') {
                    return data.imagen !== null || data.clear_imagen;
                }

                return initial[key] !== data[key];
            },
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

    const createArea = (query: string) => {
        setCreatingArea(true);
        router.post(
            carta.areas.store().url,
            { nombre: query },
            {
                preserveScroll: true,
                onFinish: () => setCreatingArea(false),
            },
        );
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const onSuccess = () => {
            reset();
            clearErrors();
            onOpenChange(false);
        };

        const payload = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess,
        };

        if (isEdit && producto) {
            // Inertia: method spoofing for multipart PATCH
            router.post(
                carta.productos.update(producto.id).url,
                {
                    ...data,
                    area_id: data.area_id || null,
                    _method: 'patch',
                },
                payload,
            );

            return;
        }

        post(carta.productos.store().url, payload);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={handleClose}
            title={
                isEdit
                    ? t('producto_form.title_edit')
                    : t('producto_form.title_create')
            }
            description={
                isEdit
                    ? t('producto_form.description_edit')
                    : t('producto_form.description_create')
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
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {isEdit
                            ? t('producto_form.submit_edit')
                            : t('producto_form.submit_create')}
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

                {categorias.length === 0 ? (
                    <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                        {t('producto_form.no_categories')}
                    </p>
                ) : null}

                <FormSection
                    index={0}
                    title={t('producto_form.section_basic')}
                    columns={2}
                >
                    <FormField
                        id="producto-categoria"
                        label={t('producto_form.fields.categoria')}
                        required
                        error={errors.categoria_id}
                    >
                        <Select
                            value={data.categoria_id || undefined}
                            onValueChange={(v) => setData('categoria_id', v)}
                            disabled={processing || categorias.length === 0}
                        >
                            <SelectTrigger
                                id="producto-categoria"
                                className="w-full"
                            >
                                <SelectValue
                                    placeholder={t(
                                        'producto_form.fields.categoria_placeholder',
                                    )}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {categorias.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.nombre}
                                        {!cat.activa
                                            ? ` (${t('row.inactive')})`
                                            : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>

                    <FormField
                        id="producto-area"
                        label={t('producto_form.fields.area')}
                        error={errors.area_id}
                        hint={t('producto_form.fields.area_hint')}
                    >
                        <Combobox
                            id="producto-area"
                            options={areaOptions}
                            value={data.area_id || null}
                            onChange={(v) => setData('area_id', v ?? '')}
                            placeholder={t(
                                'producto_form.fields.area_placeholder',
                            )}
                            searchPlaceholder={t(
                                'producto_form.fields.area_search',
                            )}
                            emptyMessage={t(
                                'producto_form.fields.area_empty',
                            )}
                            creatable
                            createOptionLabel={(q) =>
                                t('producto_form.fields.area_create', {
                                    name: q,
                                })
                            }
                            onCreateOption={createArea}
                            loading={creatingArea}
                            disabled={processing}
                            clearable
                        />
                    </FormField>

                    <FormField
                        id="producto-nombre"
                        label={t('producto_form.fields.nombre')}
                        required
                        error={errors.nombre}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="producto-nombre"
                            value={data.nombre}
                            onChange={(e) => setData('nombre', e.target.value)}
                            placeholder={t(
                                'producto_form.fields.nombre_placeholder',
                            )}
                            autoFocus
                        />
                    </FormField>

                    <FormField
                        id="producto-codigo"
                        label={t('producto_form.fields.codigo')}
                        error={errors.codigo}
                    >
                        <Input
                            id="producto-codigo"
                            value={data.codigo}
                            onChange={(e) => setData('codigo', e.target.value)}
                            placeholder={t(
                                'producto_form.fields.codigo_placeholder',
                            )}
                        />
                    </FormField>

                    <FormField
                        id="producto-precio"
                        label={t('producto_form.fields.precio')}
                        required
                        error={errors.precio}
                    >
                        <Input
                            id="producto-precio"
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            value={data.precio}
                            onChange={(e) => setData('precio', e.target.value)}
                            placeholder="0.00"
                        />
                    </FormField>

                    <FormField
                        id="producto-descripcion"
                        label={t('producto_form.fields.descripcion')}
                        error={errors.descripcion}
                        className="sm:col-span-2"
                    >
                        <Textarea
                            id="producto-descripcion"
                            value={data.descripcion}
                            onChange={(e) =>
                                setData('descripcion', e.target.value)
                            }
                            rows={2}
                            placeholder={t(
                                'producto_form.fields.descripcion_placeholder',
                            )}
                        />
                    </FormField>

                    <FormField
                        id="producto-imagen"
                        label={t('producto_form.fields.imagen')}
                        error={errors.imagen}
                        className="sm:col-span-2"
                    >
                        <ProductoImagenUploader
                            currentUrl={
                                data.clear_imagen
                                    ? null
                                    : (producto?.imagen_url ?? null)
                            }
                            file={data.imagen}
                            pendingRemoval={data.clear_imagen}
                            error={errors.imagen}
                            disabled={processing}
                            onSelect={(file) => {
                                setData('imagen', file);
                                setData('clear_imagen', false);
                            }}
                            onClearSelection={() => setData('imagen', null)}
                            onTogglePendingRemoval={() =>
                                setData('clear_imagen', !data.clear_imagen)
                            }
                        />
                    </FormField>

                    <FormField
                        id="producto-orden"
                        label={t('producto_form.fields.orden')}
                        error={errors.orden}
                        hint={t('producto_form.fields.orden_hint')}
                    >
                        <Input
                            id="producto-orden"
                            type="number"
                            min={0}
                            max={9999}
                            value={data.orden}
                            onChange={(e) =>
                                setData(
                                    'orden',
                                    Number.parseInt(e.target.value, 10) || 0,
                                )
                            }
                        />
                    </FormField>
                </FormSection>

                <FormSection
                    index={1}
                    title={t('producto_form.section_status')}
                >
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:bg-muted/30">
                        <Checkbox
                            id="producto-activo"
                            checked={data.activo}
                            onCheckedChange={(checked) =>
                                setData('activo', checked === true)
                            }
                            className="mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">
                                {t('producto_form.fields.activo')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {t('producto_form.fields.activo_hint')}
                            </span>
                        </div>
                    </label>
                    {errors.activo ? (
                        <p className="text-xs text-destructive">
                            {errors.activo}
                        </p>
                    ) : null}
                </FormSection>
            </div>
        </FormModal>
    );
}

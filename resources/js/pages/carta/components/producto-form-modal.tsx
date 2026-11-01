import { router, useForm, usePage } from '@inertiajs/react';
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
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/use-permission';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import carta from '../carta-routes';
import type {
    AreaCarta,
    CategoriaCarta,
    ControlInventario,
    ProductoCarta,
} from '../types';
import { ProductoImagenUploader } from './producto-imagen-uploader';

export type ProductoFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    producto: ProductoCarta | null;
    categorias: readonly CategoriaCarta[];
    areas: readonly AreaCarta[];
    defaultCategoriaId?: string | null;
    /** Siguiente orden sugerido por categoría (create). */
    nextOrdenByCategoria?: Readonly<Record<string, number>>;
};

type ProductoFormData = {
    categoria_id: string;
    area_id: string;
    nombre: string;
    descripcion: string;
    codigo: string;
    codigo_barras: string;
    precio: string;
    orden: OrdenValue;
    activo: boolean;
    control_inventario: ControlInventario;
    stock_inicial: string;
    stock_minimo: string;
    imagen: File | null;
    clear_imagen: boolean;
};

type FlashProps = {
    flash?: {
        created_area_id?: string | null;
    } | null;
};

const suggestedProductoOrden = (
    categoriaId: string,
    nextOrdenByCategoria: Readonly<Record<string, number>>,
): number => nextOrdenByCategoria[categoriaId] ?? 1;

const emptyForm = (
    categoriaId: string,
    nextOrdenByCategoria: Readonly<Record<string, number>>,
): ProductoFormData => ({
    categoria_id: categoriaId,
    area_id: '',
    nombre: '',
    descripcion: '',
    codigo: '',
    codigo_barras: '',
    precio: '',
    orden: suggestedProductoOrden(categoriaId, nextOrdenByCategoria),
    activo: true,
    control_inventario: 'none',
    stock_inicial: '0',
    stock_minimo: '',
    imagen: null,
    clear_imagen: false,
});

const buildInitialData = (
    producto: ProductoCarta | null,
    fallbackCategoriaId: string,
    nextOrdenByCategoria: Readonly<Record<string, number>>,
): ProductoFormData => ({
    categoria_id: producto?.categoria_id ?? fallbackCategoriaId,
    area_id: producto?.area_id ?? '',
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    codigo: producto?.codigo ?? '',
    codigo_barras: producto?.codigo_barras ?? '',
    precio: producto?.precio ?? '',
    orden: producto
        ? producto.orden
        : suggestedProductoOrden(fallbackCategoriaId, nextOrdenByCategoria),
    activo: producto?.activo ?? true,
    control_inventario: producto?.control_inventario ?? 'none',
    stock_inicial: producto?.stock ?? '0',
    stock_minimo: producto?.stock_minimo ?? '',
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
    nextOrdenByCategoria = {},
}: ProductoFormModalProps) {
    const { t } = useTranslation(['carta', 'common']);
    const { can } = usePermission();
    const canManageAreas = can('carta.manage-areas');
    const { flash } = usePage<FlashProps>().props;
    const isEdit = producto !== null;
    const fallbackCategoria =
        defaultCategoriaId ??
        categorias.find((c) => c.activa)?.id ??
        categorias[0]?.id ??
        '';

    const { data, setData, errors, reset, clearErrors } =
        useForm<ProductoFormData>(
            emptyForm(fallbackCategoria, nextOrdenByCategoria),
        );

    const initialSnapshotRef = useRef<ProductoFormData>(
        emptyForm(fallbackCategoria, nextOrdenByCategoria),
    );
    const [creatingArea, setCreatingArea] = useState(false);
    const [saving, setSaving] = useState(false);
    const [areaToDelete, setAreaToDelete] = useState<AreaCarta | null>(null);
    const ordenTouchedRef = useRef(false);
    const canSubmit =
        isFormValid(data) && !saving && categorias.length > 0;

    const suggestedOrden = suggestedProductoOrden(
        data.categoria_id || fallbackCategoria,
        nextOrdenByCategoria,
    );

    useEffect(() => {
        if (open) {
            ordenTouchedRef.current = false;
            const initial = buildInitialData(
                producto,
                fallbackCategoria,
                nextOrdenByCategoria,
            );
            initialSnapshotRef.current = initial;
            (Object.keys(initial) as Array<keyof ProductoFormData>).forEach(
                (key) => {
                    setData(key, initial[key]);
                },
            );
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, producto?.id, fallbackCategoria, nextOrdenByCategoria]);

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

    const askDeleteArea = (areaId: string) => {
        const area = areas.find((a) => a.id === areaId);
        if (!area) {
            return;
        }
        setAreaToDelete(area);
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const onSuccess = () => {
            reset();
            clearErrors();
            onOpenChange(false);
        };

        const orden = resolveOrdenValue(data.orden, suggestedOrden);
        const payload = {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess,
        };

        if (isEdit && producto) {
            // Inertia: method spoofing for multipart PATCH
            router.post(
                carta.productos.update(producto.id).url,
                {
                    ...data,
                    orden,
                    area_id: data.area_id || null,
                    _method: 'patch',
                },
                payload,
            );

            return;
        }

        router.post(
            carta.productos.store().url,
            {
                ...data,
                orden,
                area_id: data.area_id || null,
            },
            payload,
        );
    };

    return (
        <>
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
                            onValueChange={(v) => {
                                setData('categoria_id', v);
                                if (!isEdit && !ordenTouchedRef.current) {
                                    setData(
                                        'orden',
                                        suggestedProductoOrden(
                                            v,
                                            nextOrdenByCategoria,
                                        ),
                                    );
                                }
                            }}
                            disabled={saving || categorias.length === 0}
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
                        info={t('producto_form.fields.area_info')}
                        infoLabel={t('producto_form.fields.area_info_label')}
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
                            creatable={canManageAreas}
                            createOptionLabel={(q) =>
                                t('producto_form.fields.area_create', {
                                    name: q,
                                })
                            }
                            onCreateOption={
                                canManageAreas ? createArea : undefined
                            }
                            onDeleteOption={
                                canManageAreas ? askDeleteArea : undefined
                            }
                            deleteOptionLabel={(opt) =>
                                t('producto_form.fields.area_delete', {
                                    name: opt.label,
                                })
                            }
                            loading={creatingArea}
                            disabled={saving}
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
                            disabled={saving}
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
                        <OrdenInput
                            id="producto-orden"
                            value={data.orden}
                            fallbackOnEmpty={
                                isEdit
                                    ? (producto?.orden ?? suggestedOrden)
                                    : suggestedOrden
                            }
                            onChange={(v) => {
                                ordenTouchedRef.current = true;
                                setData('orden', v);
                            }}
                        />
                    </FormField>
                </FormSection>

                <FormSection
                    index={1}
                    title={t('producto_form.section_inventory')}
                    columns={2}
                >
                    <p className="sm:col-span-2 text-xs text-muted-foreground">
                        {t('producto_form.section_inventory_hint')}
                    </p>
                    <FormField
                        id="producto-control"
                        label={t('producto_form.fields.control_inventario')}
                        required
                        error={errors.control_inventario}
                        hint={t('producto_form.fields.control_hint')}
                        className="sm:col-span-2"
                    >
                            <Select
                            value={data.control_inventario}
                            onValueChange={(v) => {
                                const next = v as ControlInventario;
                                setData('control_inventario', next);
                                if (next !== 'sku') {
                                    setData('codigo_barras', '');
                                }
                            }}
                            disabled={saving}
                        >
                            <SelectTrigger id="producto-control" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    {t('producto_form.fields.control_none')}
                                </SelectItem>
                                <SelectItem value="sku">
                                    {t('producto_form.fields.control_sku')}
                                </SelectItem>
                                <SelectItem value="recipe">
                                    {t('producto_form.fields.control_recipe')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </FormField>

                    {data.control_inventario === 'sku' ? (
                        <>
                            <FormField
                                id="producto-codigo-barras"
                                label={t(
                                    'producto_form.fields.codigo_barras',
                                )}
                                error={errors.codigo_barras}
                                hint={t(
                                    'producto_form.fields.codigo_barras_hint',
                                )}
                                className="sm:col-span-2"
                            >
                                <Input
                                    id="producto-codigo-barras"
                                    value={data.codigo_barras}
                                    placeholder={t(
                                        'producto_form.fields.codigo_barras_placeholder',
                                    )}
                                    autoComplete="off"
                                    inputMode="numeric"
                                    onChange={(e) =>
                                        setData(
                                            'codigo_barras',
                                            e.target.value.trim(),
                                        )
                                    }
                                />
                            </FormField>
                            {!isEdit ||
                            (producto &&
                                producto.control_inventario !== 'sku') ? (
                                <FormField
                                    id="producto-stock-inicial"
                                    label={t(
                                        'producto_form.fields.stock_inicial',
                                    )}
                                    error={errors.stock_inicial}
                                    hint={t(
                                        'producto_form.fields.stock_inicial_hint',
                                    )}
                                >
                                    <Input
                                        id="producto-stock-inicial"
                                        type="number"
                                        min={0}
                                        step="0.001"
                                        value={data.stock_inicial}
                                        onChange={(e) =>
                                            setData(
                                                'stock_inicial',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                            ) : (
                                <p className="text-sm text-muted-foreground sm:col-span-1">
                                    {t('producto_form.fields.stock_actual', {
                                        stock: producto?.stock ?? '0',
                                    })}
                                </p>
                            )}
                            <FormField
                                id="producto-stock-minimo"
                                label={t('producto_form.fields.stock_minimo')}
                                error={errors.stock_minimo}
                                hint={t(
                                    'producto_form.fields.stock_minimo_hint',
                                )}
                            >
                                <Input
                                    id="producto-stock-minimo"
                                    type="number"
                                    min={0}
                                    step="0.001"
                                    value={data.stock_minimo}
                                    onChange={(e) =>
                                        setData('stock_minimo', e.target.value)
                                    }
                                />
                            </FormField>
                        </>
                    ) : null}
                </FormSection>

                <FormSection
                    index={2}
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

        <ConfirmDeleteDialog
            open={areaToDelete !== null}
            onOpenChange={(next) => {
                if (!next) {
                    setAreaToDelete(null);
                }
            }}
            title={t('delete.area_title')}
            description={t('producto_form.fields.area_delete_confirm', {
                name: areaToDelete?.nombre ?? '',
            })}
            deleteUrl={
                areaToDelete
                    ? carta.areas.destroy(areaToDelete.id).url
                    : null
            }
            loadingLabel={t('delete.deleting')}
            onSuccess={() => {
                if (areaToDelete && data.area_id === areaToDelete.id) {
                    setData('area_id', '');
                }
                setAreaToDelete(null);
            }}
        />
        </>
    );
}

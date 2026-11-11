import { Head, Link, router, usePage } from '@inertiajs/react';
import { Loader2, Plus, Trash2, Truck } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
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
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { ProveedorFormModal } from '../proveedores/components/proveedor-form-modal';
import compras from './compras-routes';
import type { CompraCatalog, CompraDetail, CompraLineaRow } from './types';

type Props = {
    compra: CompraDetail | null;
    catalog: CompraCatalog;
};

type FormLinea = {
    linea_tipo: 'insumo' | 'producto';
    insumo_id: string;
    producto_id: string;
    cantidad: string;
    costo_unitario: string;
    unidad: string;
};

type FormState = {
    proveedor_id: string;
    fecha: string;
    notas: string;
    lineas: FormLinea[];
};

type FlashProps = {
    flash?: {
        created_proveedor_id?: string | null;
    } | null;
};

const emptyLinea = (): FormLinea => ({
    linea_tipo: 'insumo',
    insumo_id: '',
    producto_id: '',
    cantidad: '',
    costo_unitario: '',
    unidad: 'und',
});

const toFormLineas = (lineas: CompraLineaRow[]): FormLinea[] =>
    lineas.length
        ? lineas.map((l) => ({
              linea_tipo: l.linea_tipo,
              insumo_id: l.insumo_id ?? '',
              producto_id: l.producto_id ?? '',
              cantidad: String(l.cantidad),
              costo_unitario: String(l.costo_unitario),
              unidad: l.unidad || 'und',
          }))
        : [emptyLinea()];

function money(value: number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(value);
}

function lineaImporte(linea: FormLinea): number {
    const qty = Number(linea.cantidad);
    const costo = Number(linea.costo_unitario);
    if (Number.isNaN(qty) || Number.isNaN(costo) || qty <= 0 || costo < 0) {
        return 0;
    }
    return qty * costo;
}

export default function CompraFormPage({ compra, catalog }: Props) {
    const { t } = useTranslation(['compras', 'common']);
    const { can } = usePermission();
    const canCreateProveedor = can('proveedores.create');
    const isEdit = compra !== null;
    const page = usePage<FlashProps>();
    const pageErrors = (page.props.errors ?? {}) as Record<string, string>;
    const [saving, setSaving] = useState(false);
    const [proveedorModalOpen, setProveedorModalOpen] = useState(false);
    const [proveedorDraftName, setProveedorDraftName] = useState('');
    const [data, setData] = useState<FormState>({
        proveedor_id: compra?.proveedor_id ?? '',
        fecha: compra?.fecha ?? new Date().toISOString().slice(0, 10),
        notas: compra?.notas ?? '',
        lineas: toFormLineas(compra?.lineas ?? []),
    });

    useEffect(() => {
        const createdId = page.props.flash?.created_proveedor_id;
        if (!createdId) {
            return;
        }
        setData((prev) => ({ ...prev, proveedor_id: createdId }));
        router.reload({ only: ['catalog'], preserveScroll: true });
    }, [page.props.flash?.created_proveedor_id]);

    const proveedorOptions = useMemo<ComboboxOption[]>(
        () =>
            catalog.proveedores.map((p) => ({
                value: p.id,
                label: p.ruc ? `${p.nombre} (${p.ruc})` : p.nombre,
            })),
        [catalog.proveedores],
    );

    const total = useMemo(
        () => data.lineas.reduce((sum, l) => sum + lineaImporte(l), 0),
        [data.lineas],
    );

    const canSubmit = useMemo(() => {
        if (saving || !data.fecha) return false;
        if (data.lineas.length < 1) return false;
        return data.lineas.every((l) => {
            const itemOk =
                l.linea_tipo === 'insumo'
                    ? l.insumo_id !== ''
                    : l.producto_id !== '';
            return (
                itemOk &&
                Number(l.cantidad) > 0 &&
                !Number.isNaN(Number(l.cantidad)) &&
                Number(l.costo_unitario) >= 0 &&
                !Number.isNaN(Number(l.costo_unitario))
            );
        });
    }, [saving, data]);

    const setLinea = (index: number, patch: Partial<FormLinea>) => {
        setData((prev) => {
            const next = [...prev.lineas];
            next[index] = { ...next[index], ...patch };
            return { ...prev, lineas: next };
        });
    };

    const openCreateProveedor = (query = '') => {
        setProveedorDraftName(query.trim());
        setProveedorModalOpen(true);
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const payload = {
            proveedor_id: data.proveedor_id || null,
            fecha: data.fecha,
            notas: data.notas,
            lineas: data.lineas.map((l) => ({
                linea_tipo: l.linea_tipo,
                insumo_id:
                    l.linea_tipo === 'insumo' ? l.insumo_id || null : null,
                producto_id:
                    l.linea_tipo === 'producto' ? l.producto_id || null : null,
                cantidad: l.cantidad,
                costo_unitario: l.costo_unitario,
                unidad: l.unidad,
            })),
        };
        const opts = {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
        };
        if (isEdit && compra) {
            router.put(compras.update(compra.id).url, payload, opts);
            return;
        }
        router.post(compras.store().url, payload, opts);
    };

    return (
        <>
            <Head
                title={
                    isEdit
                        ? t('form.edit', { numero: compra?.numero })
                        : t('form.create')
                }
            />
            <form
                onSubmit={onSubmit}
                className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 p-4 sm:p-6"
            >
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">
                            {isEdit
                                ? t('form.edit', { numero: compra?.numero })
                                : t('form.create')}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t('form.subtitle')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer"
                        >
                            <Link
                                href={
                                    isEdit && compra
                                        ? compras.show(compra.id).url
                                        : compras.index().url
                                }
                            >
                                {t('common:actions.cancel')}
                            </Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={!canSubmit}
                            className="cursor-pointer gap-2"
                        >
                            {saving ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : null}
                            {t('actions.save')}
                        </Button>
                    </div>
                </div>

                <FormSection
                    index={0}
                    title={t('form.section_datos')}
                    columns={2}
                >
                    <FormField
                        id="oc-proveedor"
                        label={t('form.proveedor')}
                        hint={t('form.proveedor_hint')}
                        error={pageErrors.proveedor_id}
                        className="sm:col-span-2"
                    >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                            <div className="min-w-0 flex-1">
                                <Combobox
                                    id="oc-proveedor"
                                    options={proveedorOptions}
                                    value={data.proveedor_id || null}
                                    onChange={(v) =>
                                        setData((prev) => ({
                                            ...prev,
                                            proveedor_id: v ?? '',
                                        }))
                                    }
                                    placeholder={t(
                                        'form.proveedor_placeholder',
                                    )}
                                    searchPlaceholder={t(
                                        'form.proveedor_search',
                                    )}
                                    emptyMessage={t('form.proveedor_empty')}
                                    creatable={canCreateProveedor}
                                    createOptionLabel={(q) =>
                                        t('form.proveedor_create', { name: q })
                                    }
                                    onCreateOption={(q) =>
                                        openCreateProveedor(q)
                                    }
                                    clearable
                                />
                            </div>
                            {canCreateProveedor ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="cursor-pointer gap-1.5 shrink-0"
                                    onClick={() => openCreateProveedor()}
                                >
                                    <Truck className="size-4" />
                                    {t('form.proveedor_new')}
                                </Button>
                            ) : null}
                        </div>
                    </FormField>
                    <FormField
                        id="oc-fecha"
                        label={t('form.fecha')}
                        required
                        error={pageErrors.fecha}
                    >
                        <Input
                            id="oc-fecha"
                            type="date"
                            value={data.fecha}
                            onChange={(e) =>
                                setData((prev) => ({
                                    ...prev,
                                    fecha: e.target.value,
                                }))
                            }
                        />
                    </FormField>
                    <FormField
                        id="oc-notas"
                        label={t('form.notas')}
                        error={pageErrors.notas}
                    >
                        <Textarea
                            id="oc-notas"
                            value={data.notas}
                            onChange={(e) =>
                                setData((prev) => ({
                                    ...prev,
                                    notas: e.target.value,
                                }))
                            }
                            rows={2}
                            placeholder={t('form.notas_placeholder')}
                        />
                    </FormField>
                </FormSection>

                <section className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-sm font-semibold">
                                {t('form.lineas')}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {t('form.lineas_hint')}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer gap-1.5"
                            onClick={() =>
                                setData((prev) => ({
                                    ...prev,
                                    lineas: [...prev.lineas, emptyLinea()],
                                }))
                            }
                        >
                            <Plus className="size-3.5" />
                            {t('actions.add_linea')}
                        </Button>
                    </div>

                    {typeof pageErrors.lineas === 'string' ? (
                        <p className="text-xs text-destructive">
                            {pageErrors.lineas}
                        </p>
                    ) : null}

                    <div className="overflow-hidden rounded-xl border">
                        <div className="hidden grid-cols-[7.5rem_minmax(0,1.4fr)_5.5rem_6.5rem_6.5rem_2.5rem] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:grid">
                            <span>{t('form.tipo')}</span>
                            <span>{t('form.item')}</span>
                            <span className="text-right">
                                {t('form.cantidad')}
                            </span>
                            <span className="text-right">{t('form.costo')}</span>
                            <span className="text-right">
                                {t('form.importe')}
                            </span>
                            <span className="sr-only">{t('form.remove')}</span>
                        </div>

                        <div className="divide-y">
                            {data.lineas.map((linea, index) => {
                                const itemOptions: ComboboxOption[] =
                                    linea.linea_tipo === 'insumo'
                                        ? catalog.insumos
                                              .filter(
                                                  (i) =>
                                                      i.id ===
                                                          linea.insumo_id ||
                                                      !data.lineas.some(
                                                          (l, j) =>
                                                              j !== index &&
                                                              l.linea_tipo ===
                                                                  'insumo' &&
                                                              l.insumo_id ===
                                                                  i.id,
                                                      ),
                                              )
                                              .map((i) => ({
                                                  value: i.id,
                                                  label: `${i.nombre} (${i.unidad})`,
                                              }))
                                        : catalog.productos
                                              .filter(
                                                  (p) =>
                                                      p.id ===
                                                          linea.producto_id ||
                                                      !data.lineas.some(
                                                          (l, j) =>
                                                              j !== index &&
                                                              l.linea_tipo ===
                                                                  'producto' &&
                                                              l.producto_id ===
                                                                  p.id,
                                                      ),
                                              )
                                              .map((p) => ({
                                                  value: p.id,
                                                  label: p.nombre,
                                              }));

                                const importe = lineaImporte(linea);

                                return (
                                    <div
                                        key={`linea-${index}`}
                                        className={cn(
                                            'grid gap-2 p-3',
                                            'grid-cols-1',
                                            'lg:grid-cols-[7.5rem_minmax(0,1.4fr)_5.5rem_6.5rem_6.5rem_2.5rem] lg:items-center',
                                        )}
                                    >
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground lg:sr-only">
                                                {t('form.tipo')}
                                            </label>
                                            <Select
                                                value={linea.linea_tipo}
                                                onValueChange={(v) =>
                                                    setLinea(index, {
                                                        linea_tipo:
                                                            v as FormLinea['linea_tipo'],
                                                        insumo_id: '',
                                                        producto_id: '',
                                                        unidad: 'und',
                                                        costo_unitario: '',
                                                    })
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="insumo">
                                                        {t('form.tipo_insumo')}
                                                    </SelectItem>
                                                    <SelectItem value="producto">
                                                        {t(
                                                            'form.tipo_producto',
                                                        )}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1 min-w-0">
                                            <label className="text-xs font-medium text-muted-foreground lg:sr-only">
                                                {t('form.item')}
                                            </label>
                                            <Combobox
                                                options={itemOptions}
                                                value={
                                                    (linea.linea_tipo ===
                                                    'insumo'
                                                        ? linea.insumo_id
                                                        : linea.producto_id) ||
                                                    null
                                                }
                                                onChange={(v) => {
                                                    if (
                                                        linea.linea_tipo ===
                                                        'insumo'
                                                    ) {
                                                        const ins =
                                                            catalog.insumos.find(
                                                                (i) =>
                                                                    i.id === v,
                                                            );
                                                        setLinea(index, {
                                                            insumo_id: v ?? '',
                                                            unidad:
                                                                ins?.unidad ??
                                                                'und',
                                                            costo_unitario:
                                                                ins?.costo_unitario ??
                                                                linea.costo_unitario,
                                                        });
                                                    } else {
                                                        const prod =
                                                            catalog.productos.find(
                                                                (p) =>
                                                                    p.id === v,
                                                            );
                                                        setLinea(index, {
                                                            producto_id:
                                                                v ?? '',
                                                            unidad: 'und',
                                                            costo_unitario:
                                                                prod?.costo_unitario ??
                                                                linea.costo_unitario,
                                                        });
                                                    }
                                                }}
                                                placeholder={t(
                                                    'form.item_placeholder',
                                                )}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground lg:sr-only">
                                                {t('form.cantidad')}
                                                {linea.unidad
                                                    ? ` (${linea.unidad})`
                                                    : ''}
                                            </label>
                                            <Input
                                                type="number"
                                                min={0.001}
                                                step="0.001"
                                                inputMode="decimal"
                                                aria-label={t('form.cantidad')}
                                                value={linea.cantidad}
                                                onChange={(e) =>
                                                    setLinea(index, {
                                                        cantidad:
                                                            e.target.value,
                                                    })
                                                }
                                                className="text-right tabular-nums"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground lg:sr-only">
                                                {t('form.costo')}
                                            </label>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.0001"
                                                inputMode="decimal"
                                                aria-label={t('form.costo')}
                                                value={linea.costo_unitario}
                                                onChange={(e) =>
                                                    setLinea(index, {
                                                        costo_unitario:
                                                            e.target.value,
                                                    })
                                                }
                                                className="text-right tabular-nums"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-2 lg:justify-end">
                                            <span className="text-xs text-muted-foreground lg:hidden">
                                                {t('form.importe')}
                                            </span>
                                            <span className="tabular-nums text-sm font-medium">
                                                {money(importe)}
                                            </span>
                                        </div>

                                        <div className="flex justify-end lg:justify-center">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-9 cursor-pointer text-destructive"
                                                disabled={
                                                    data.lineas.length <= 1
                                                }
                                                onClick={() =>
                                                    setData((prev) => ({
                                                        ...prev,
                                                        lineas: prev.lineas.filter(
                                                            (_, i) =>
                                                                i !== index,
                                                        ),
                                                    }))
                                                }
                                                aria-label={t('form.remove')}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-3 py-3">
                            <span className="text-sm font-medium">
                                {t('form.total')}
                            </span>
                            <span className="text-base font-semibold tabular-nums">
                                {money(total)}
                            </span>
                        </div>
                    </div>
                </section>
            </form>

            <ProveedorFormModal
                open={proveedorModalOpen}
                onOpenChange={setProveedorModalOpen}
                proveedor={null}
                initialNombre={proveedorDraftName}
                onCreated={() => {
                    router.reload({ only: ['catalog'], preserveScroll: true });
                }}
            />
        </>
    );
}

CompraFormPage.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Compras', href: '/compras' },
            { title: 'Orden' },
        ]}
    >
        {page}
    </AppLayout>
);

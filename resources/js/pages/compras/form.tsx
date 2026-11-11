import { Head, Link, router, usePage } from '@inertiajs/react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
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
import AppLayout from '@/layouts/app-layout';
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

export default function CompraFormPage({ compra, catalog }: Props) {
    const { t } = useTranslation(['compras', 'common']);
    const isEdit = compra !== null;
    const pageErrors = (usePage().props.errors ?? {}) as Record<
        string,
        string
    >;
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<FormState>({
        proveedor_id: compra?.proveedor_id ?? '',
        fecha: compra?.fecha ?? new Date().toISOString().slice(0, 10),
        notas: compra?.notas ?? '',
        lineas: toFormLineas(compra?.lineas ?? []),
    });

    const proveedorOptions = useMemo<ComboboxOption[]>(
        () =>
            catalog.proveedores.map((p) => ({
                value: p.id,
                label: p.ruc ? `${p.nombre} (${p.ruc})` : p.nombre,
            })),
        [catalog.proveedores],
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
                className="flex flex-1 flex-col gap-5 p-4 sm:p-6"
            >
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            {isEdit
                                ? t('form.edit', { numero: compra?.numero })
                                : t('form.create')}
                        </h1>
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

                <FormSection index={0} title={t('form.create')} columns={2}>
                    <FormField
                        id="oc-proveedor"
                        label={t('form.proveedor')}
                        error={pageErrors.proveedor_id}
                    >
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
                            placeholder={t('form.proveedor_placeholder')}
                            clearable
                        />
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
                        className="sm:col-span-2"
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
                        />
                    </FormField>
                </FormSection>

                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold">
                            {t('form.lineas')}
                        </h2>
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

                    {data.lineas.map((linea, index) => {
                        const itemOptions: ComboboxOption[] =
                            linea.linea_tipo === 'insumo'
                                ? catalog.insumos
                                      .filter(
                                          (i) =>
                                              i.id === linea.insumo_id ||
                                              !data.lineas.some(
                                                  (l, j) =>
                                                      j !== index &&
                                                      l.linea_tipo ===
                                                          'insumo' &&
                                                      l.insumo_id === i.id,
                                              ),
                                      )
                                      .map((i) => ({
                                          value: i.id,
                                          label: `${i.nombre} (${i.unidad})`,
                                      }))
                                : catalog.productos
                                      .filter(
                                          (p) =>
                                              p.id === linea.producto_id ||
                                              !data.lineas.some(
                                                  (l, j) =>
                                                      j !== index &&
                                                      l.linea_tipo ===
                                                          'producto' &&
                                                      l.producto_id === p.id,
                                              ),
                                      )
                                      .map((p) => ({
                                          value: p.id,
                                          label: p.nombre,
                                      }));

                        return (
                            <div
                                key={`linea-${index}`}
                                className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[8rem_1fr_6rem_7rem_auto]"
                            >
                                <Select
                                    value={linea.linea_tipo}
                                    onValueChange={(v) =>
                                        setLinea(index, {
                                            linea_tipo: v as FormLinea['linea_tipo'],
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
                                            {t('form.tipo_producto')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <Combobox
                                    options={itemOptions}
                                    value={
                                        (linea.linea_tipo === 'insumo'
                                            ? linea.insumo_id
                                            : linea.producto_id) || null
                                    }
                                    onChange={(v) => {
                                        if (linea.linea_tipo === 'insumo') {
                                            const ins = catalog.insumos.find(
                                                (i) => i.id === v,
                                            );
                                            setLinea(index, {
                                                insumo_id: v ?? '',
                                                unidad: ins?.unidad ?? 'und',
                                                costo_unitario:
                                                    ins?.costo_unitario ??
                                                    linea.costo_unitario,
                                            });
                                        } else {
                                            const prod = catalog.productos.find(
                                                (p) => p.id === v,
                                            );
                                            setLinea(index, {
                                                producto_id: v ?? '',
                                                unidad: 'und',
                                                costo_unitario:
                                                    prod?.costo_unitario ??
                                                    linea.costo_unitario,
                                            });
                                        }
                                    }}
                                    placeholder={t('form.item_placeholder')}
                                />

                                <Input
                                    type="number"
                                    min={0.001}
                                    step="0.001"
                                    placeholder={t('form.cantidad')}
                                    value={linea.cantidad}
                                    onChange={(e) =>
                                        setLinea(index, {
                                            cantidad: e.target.value,
                                        })
                                    }
                                />
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.0001"
                                    placeholder={t('form.costo')}
                                    value={linea.costo_unitario}
                                    onChange={(e) =>
                                        setLinea(index, {
                                            costo_unitario: e.target.value,
                                        })
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-9 cursor-pointer text-destructive"
                                    disabled={data.lineas.length <= 1}
                                    onClick={() =>
                                        setData((prev) => ({
                                            ...prev,
                                            lineas: prev.lineas.filter(
                                                (_, i) => i !== index,
                                            ),
                                        }))
                                    }
                                    aria-label={t('form.remove')}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </form>
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

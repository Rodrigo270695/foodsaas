import { Head, Link, router, usePage } from '@inertiajs/react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from 'react';
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
import { transferenciasUrl, type SedeItems, type SedeOption } from './types';

type Props = {
    transferencia: null;
    sedes: SedeOption[];
    origen_items: SedeItems;
    default_origen_id: string;
};

type FormLinea = {
    linea_tipo: 'insumo' | 'producto';
    origen_id: string;
    destino_id: string;
    cantidad: string;
    unidad: string;
};

const emptyLinea = (): FormLinea => ({
    linea_tipo: 'insumo',
    origen_id: '',
    destino_id: '',
    cantidad: '',
    unidad: 'und',
});

const EMPTY_ITEMS: SedeItems = { insumos: [], productos: [] };

export default function TransferenciaFormPage({
    sedes,
    origen_items,
    default_origen_id,
}: Props) {
    const { t } = useTranslation(['transferencias', 'common']);
    const page = usePage();
    const errors = (page.props.errors ?? {}) as Record<string, string>;

    const [saving, setSaving] = useState(false);
    const [origenId, setOrigenId] = useState(default_origen_id);
    const [destinoId, setDestinoId] = useState('');
    const [notas, setNotas] = useState('');
    const [lineas, setLineas] = useState<FormLinea[]>([emptyLinea()]);
    const [origenItems, setOrigenItems] = useState<SedeItems>(origen_items);
    const [destinoItems, setDestinoItems] = useState<SedeItems>(EMPTY_ITEMS);
    const [loadingDestino, setLoadingDestino] = useState(false);

    const loadItems = useCallback(
        async (sedeId: string): Promise<SedeItems> => {
            const res = await fetch(transferenciasUrl.itemsSede(sedeId), {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!res.ok) return EMPTY_ITEMS;
            return (await res.json()) as SedeItems;
        },
        [],
    );

    useEffect(() => {
        if (!destinoId) {
            setDestinoItems(EMPTY_ITEMS);
            return;
        }
        let cancelled = false;
        setLoadingDestino(true);
        void loadItems(destinoId)
            .then((items) => {
                if (!cancelled) setDestinoItems(items);
            })
            .finally(() => {
                if (!cancelled) setLoadingDestino(false);
            });
        return () => {
            cancelled = true;
        };
    }, [destinoId, loadItems]);

    const onOrigenChange = (id: string) => {
        setOrigenId(id);
        setLineas([emptyLinea()]);
        void loadItems(id).then(setOrigenItems);
    };

    const onDestinoChange = (id: string) => {
        setDestinoId(id);
        setLineas((prev) => prev.map((l) => ({ ...l, destino_id: '' })));
    };

    const setLinea = (index: number, patch: Partial<FormLinea>) =>
        setLineas((prev) =>
            prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
        );

    const optionsFor = (
        items: SedeItems,
        tipo: FormLinea['linea_tipo'],
    ): ComboboxOption[] =>
        tipo === 'insumo'
            ? items.insumos.map((i) => ({
                  value: i.id,
                  label: `${i.nombre} (${i.unidad})`,
              }))
            : items.productos.map((p) => ({ value: p.id, label: p.nombre }));

    /** Al elegir el ítem origen, intenta emparejar el destino por nombre. */
    const onPickOrigen = (index: number, linea: FormLinea, id: string) => {
        if (linea.linea_tipo === 'insumo') {
            const src = origenItems.insumos.find((i) => i.id === id);
            const match = destinoItems.insumos.find(
                (i) =>
                    i.nombre.trim().toLowerCase() ===
                    src?.nombre.trim().toLowerCase(),
            );
            setLinea(index, {
                origen_id: id,
                unidad: src?.unidad ?? 'und',
                destino_id: match?.id ?? linea.destino_id,
            });
            return;
        }
        const src = origenItems.productos.find((p) => p.id === id);
        const match = destinoItems.productos.find(
            (p) =>
                p.nombre.trim().toLowerCase() ===
                src?.nombre.trim().toLowerCase(),
        );
        setLinea(index, {
            origen_id: id,
            unidad: 'und',
            destino_id: match?.id ?? linea.destino_id,
        });
    };

    const stockOf = (linea: FormLinea): number | null => {
        const list =
            linea.linea_tipo === 'insumo'
                ? origenItems.insumos
                : origenItems.productos;
        return list.find((i) => i.id === linea.origen_id)?.stock ?? null;
    };

    const canSubmit = useMemo(
        () =>
            !saving &&
            origenId !== '' &&
            destinoId !== '' &&
            origenId !== destinoId &&
            lineas.length > 0 &&
            lineas.every(
                (l) =>
                    l.origen_id !== '' &&
                    l.destino_id !== '' &&
                    Number(l.cantidad) > 0,
            ),
        [saving, origenId, destinoId, lineas],
    );

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post(
            transferenciasUrl.store,
            {
                sede_origen_id: origenId,
                sede_destino_id: destinoId,
                notas: notas || null,
                lineas: lineas.map((l) => ({
                    linea_tipo: l.linea_tipo,
                    origen_id: l.origen_id,
                    destino_id: l.destino_id,
                    cantidad: l.cantidad,
                    unidad: l.unidad,
                })),
            },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
            },
        );
    };

    const sedeOptions: ComboboxOption[] = sedes.map((s) => ({
        value: s.id,
        label: s.nombre,
    }));

    return (
        <>
            <Head title={t('form.create')} />
            <form
                onSubmit={onSubmit}
                className="flex flex-1 flex-col gap-5 p-4 sm:gap-6 sm:p-6"
            >
                <header className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {t('form.create')}
                        </h1>
                        <p className="max-w-3xl text-sm text-muted-foreground">
                            {t('form.subtitle')}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer"
                        >
                            <Link href={transferenciasUrl.index}>
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
                </header>

                <FormSection
                    index={0}
                    title={t('form.section_datos')}
                    columns={2}
                >
                    <FormField
                        id="tf-origen"
                        label={t('form.origen')}
                        required
                        error={errors.sede_origen_id}
                    >
                        <Combobox
                            id="tf-origen"
                            options={sedeOptions}
                            value={origenId || null}
                            onChange={(v) => v && onOrigenChange(v)}
                            placeholder={t('form.sede_placeholder')}
                        />
                    </FormField>
                    <FormField
                        id="tf-destino"
                        label={t('form.destino')}
                        required
                        error={errors.sede_destino_id}
                    >
                        <Combobox
                            id="tf-destino"
                            options={sedeOptions.filter(
                                (s) => s.value !== origenId,
                            )}
                            value={destinoId || null}
                            onChange={(v) => onDestinoChange(v ?? '')}
                            placeholder={t('form.sede_placeholder')}
                        />
                    </FormField>
                    <FormField
                        id="tf-notas"
                        label={t('form.notas')}
                        error={errors.notas}
                        className="sm:col-span-2"
                    >
                        <Textarea
                            id="tf-notas"
                            rows={2}
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            placeholder={t('form.notas_placeholder')}
                        />
                    </FormField>
                </FormSection>

                <FormSection
                    index={1}
                    title={t('form.lineas')}
                    description={
                        destinoId === ''
                            ? t('form.pick_destino')
                            : loadingDestino
                              ? t('form.loading_destino')
                              : t('form.lineas_hint')
                    }
                    columns={1}
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer gap-1.5"
                            onClick={() =>
                                setLineas((prev) => [...prev, emptyLinea()])
                            }
                        >
                            <Plus className="size-3.5" />
                            {t('actions.add_linea')}
                        </Button>
                    }
                >
                    {typeof errors.lineas === 'string' ? (
                        <p className="text-xs text-destructive">
                            {errors.lineas}
                        </p>
                    ) : null}
                    <div className="divide-y overflow-hidden rounded-xl border bg-background">
                        {lineas.map((linea, index) => {
                            const stock = stockOf(linea);

                            return (
                                <div
                                    key={`linea-${index}`}
                                    className="grid gap-2 p-3 lg:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_7rem_2.5rem] lg:items-start"
                                >
                                    <Select
                                        value={linea.linea_tipo}
                                        onValueChange={(v) =>
                                            setLinea(index, {
                                                linea_tipo:
                                                    v as FormLinea['linea_tipo'],
                                                origen_id: '',
                                                destino_id: '',
                                                unidad: 'und',
                                            })
                                        }
                                    >
                                        <SelectTrigger
                                            className="w-full"
                                            aria-label={t('form.tipo')}
                                        >
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

                                    <div className="min-w-0 space-y-1">
                                        <Combobox
                                            options={optionsFor(
                                                origenItems,
                                                linea.linea_tipo,
                                            )}
                                            value={linea.origen_id || null}
                                            onChange={(v) =>
                                                onPickOrigen(
                                                    index,
                                                    linea,
                                                    v ?? '',
                                                )
                                            }
                                            placeholder={t('form.item_origen')}
                                        />
                                        {stock !== null ? (
                                            <p className="text-xs text-muted-foreground">
                                                {t('form.stock', { stock })}
                                            </p>
                                        ) : null}
                                    </div>

                                    <Combobox
                                        options={optionsFor(
                                            destinoItems,
                                            linea.linea_tipo,
                                        )}
                                        value={linea.destino_id || null}
                                        onChange={(v) =>
                                            setLinea(index, {
                                                destino_id: v ?? '',
                                            })
                                        }
                                        placeholder={t('form.item_destino')}
                                    />

                                    <Input
                                        type="number"
                                        min={0.001}
                                        step="0.001"
                                        inputMode="decimal"
                                        aria-label={t('form.cantidad')}
                                        placeholder={`${t('form.cantidad')} (${linea.unidad})`}
                                        value={linea.cantidad}
                                        onChange={(e) =>
                                            setLinea(index, {
                                                cantidad: e.target.value,
                                            })
                                        }
                                        className="text-right tabular-nums"
                                    />

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-9 cursor-pointer text-destructive"
                                        disabled={lineas.length <= 1}
                                        aria-label={t('form.remove')}
                                        onClick={() =>
                                            setLineas((prev) =>
                                                prev.filter(
                                                    (_, i) => i !== index,
                                                ),
                                            )
                                        }
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </FormSection>
            </form>
        </>
    );
}

TransferenciaFormPage.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Transferencias', href: '/transferencias' },
            { title: 'Nueva' },
        ]}
    >
        {page}
    </AppLayout>
);

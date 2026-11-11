import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Loader2,
    Package,
    Plus,
    Trash2,
    Warehouse,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { FormField } from '@/components/forms';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
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
                  label: `${i.nombre} (${i.unidad}) · stock ${i.stock}`,
              }))
            : items.productos.map((p) => ({
                  value: p.id,
                  label: `${p.nombre} · stock ${p.stock}`,
              }));

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

    const origenNombre =
        sedes.find((s) => s.id === origenId)?.nombre ?? t('form.origen');
    const destinoNombre =
        sedes.find((s) => s.id === destinoId)?.nombre ?? t('form.destino');

    return (
        <>
            <Head title={t('form.create')} />
            <form
                onSubmit={onSubmit}
                className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 sm:p-6"
            >
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-600/12 via-transparent to-transparent"
                    aria-hidden
                />

                <header className="relative flex flex-col gap-4 border-b border-border/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <Badge
                            variant="outline"
                            className="border-brand-600/30 bg-brand-600/5 text-brand-700"
                        >
                            <Warehouse className="mr-1 size-3.5" />
                            Multi-sede
                        </Badge>
                        <h1 className="text-3xl font-semibold tracking-tight text-brand-800 dark:text-brand-100">
                            {t('form.create')}
                        </h1>
                        <p className="max-w-2xl text-sm text-muted-foreground">
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
                            className="cursor-pointer gap-2 shadow-sm"
                        >
                            {saving ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : null}
                            {t('actions.save')}
                        </Button>
                    </div>
                </header>

                <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-5">
                    <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="flex size-6 items-center justify-center rounded-full bg-brand-600/10 text-[11px] text-brand-700">
                            1
                        </span>
                        Ruta de la transferencia
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
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

                        <div className="hidden items-center justify-center lg:flex">
                            <div className="flex size-11 items-center justify-center rounded-full border border-brand-600/30 bg-brand-600/10 text-brand-700 shadow-sm">
                                <ArrowRight className="size-4" aria-hidden />
                            </div>
                        </div>

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
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        <Package className="size-3.5 shrink-0" />
                        <span className="font-medium text-foreground">
                            {origenNombre}
                        </span>
                        <ArrowRight className="size-3.5" />
                        <span className="font-medium text-foreground">
                            {destinoNombre}
                        </span>
                        <span className="text-muted-foreground">
                            · Al enviar baja stock en origen; al recibir sube en
                            destino.
                        </span>
                    </div>

                    <FormField
                        id="tf-notas"
                        label={t('form.notas')}
                        error={errors.notas}
                        className="mt-4"
                    >
                        <Textarea
                            id="tf-notas"
                            rows={2}
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            placeholder={t('form.notas_placeholder')}
                            className="resize-none"
                        />
                    </FormField>
                </section>

                <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
                    <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-2">
                            <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-brand-600/10 text-[11px] font-semibold text-brand-700">
                                2
                            </span>
                            <div>
                                <h2 className="text-sm font-semibold">
                                    {t('form.lineas')}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {destinoId === ''
                                        ? t('form.pick_destino')
                                        : loadingDestino
                                          ? t('form.loading_destino')
                                          : t('form.lineas_hint')}
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer gap-1.5"
                            disabled={!destinoId}
                            onClick={() =>
                                setLineas((prev) => [...prev, emptyLinea()])
                            }
                        >
                            <Plus className="size-3.5" />
                            {t('actions.add_linea')}
                        </Button>
                    </div>

                    {typeof errors.lineas === 'string' ? (
                        <p className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive">
                            {errors.lineas}
                        </p>
                    ) : null}

                    <div className="divide-y">
                        {lineas.map((linea, index) => {
                            const stock = stockOf(linea);
                            const over =
                                stock !== null &&
                                Number(linea.cantidad) > stock;

                            return (
                                <div
                                    key={`linea-${index}`}
                                    className="grid gap-3 p-4 lg:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1fr)_8rem_2.5rem] lg:items-start"
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
                                            className="h-9 w-full"
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
                                            disabled={!origenId}
                                        />
                                        {stock !== null ? (
                                            <p
                                                className={cn(
                                                    'text-xs',
                                                    over
                                                        ? 'font-medium text-rose-600'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {t('form.stock', { stock })}
                                                {over
                                                    ? ' · supera disponible'
                                                    : ''}
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
                                        disabled={!destinoId || loadingDestino}
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
                                        className={cn(
                                            'h-9 text-right tabular-nums',
                                            over &&
                                                'border-rose-500 focus-visible:ring-rose-500/30',
                                        )}
                                    />

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-9 cursor-pointer text-destructive hover:bg-destructive/10"
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
                </section>
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

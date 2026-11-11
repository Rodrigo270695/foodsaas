import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    Eye,
    FileDown,
    Loader2,
    Plus,
    Save,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    useTransition,
} from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import carta from '../carta-routes';
import { CatalogPalette } from './components/catalog-palette';
import { EstiloCartaControls } from './components/estilo-carta-controls';
import { FondoPicker } from './components/fondo-picker';
import { MenuCanvas } from './components/menu-canvas';
import { MenuQrPanel } from './components/menu-qr-panel';
import type { TipografiaId } from './lib/tipografias';
import type {
    BuilderProducto,
    FondoPreset,
    MenuCartaDetail,
} from './types';

type EditProps = {
    carta: MenuCartaDetail;
    productos: BuilderProducto[];
    logo_url: string | null;
    public_path: string;
};

function reorder<T>(list: T[], from: number, to: number): T[] {
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);

    return next;
}

export default function BuilderEdit({
    carta: initial,
    productos,
    logo_url,
    public_path,
}: EditProps) {
    const { t } = useTranslation(['carta', 'common']);
    const [isPending, startTransition] = useTransition();
    const [page, setPage] = useState(1);
    const [fondo, setFondo] = useState<FondoPreset>(
        initial.fondo_preset || 'cream',
    );
    const [tipografia, setTipografia] = useState<TipografiaId | string>(
        initial.tipografia || 'serif',
    );
    const [colorTexto, setColorTexto] = useState(initial.color_texto || '');
    const [nombre, setNombre] = useState(initial.nombre);
    const [publicada, setPublicada] = useState(initial.publicada);
    const [paginas, setPaginas] = useState(initial.paginas);
    const [vigenteDesde, setVigenteDesde] = useState(
        initial.vigente_desde ?? '',
    );
    const [vigenteHasta, setVigenteHasta] = useState(
        initial.vigente_hasta ?? '',
    );
    const [diasSemana, setDiasSemana] = useState<number[]>(
        Array.isArray(initial.dias_semana) ? initial.dias_semana : [],
    );
    const [saving, setSaving] = useState(false);

    const DIAS = useMemo(
        () =>
            [
                { id: 1, label: t('builder.dias.lun') },
                { id: 2, label: t('builder.dias.mar') },
                { id: 3, label: t('builder.dias.mie') },
                { id: 4, label: t('builder.dias.jue') },
                { id: 5, label: t('builder.dias.vie') },
                { id: 6, label: t('builder.dias.sab') },
                { id: 7, label: t('builder.dias.dom') },
            ] as const,
        [t],
    );

    const [pageItems, setPageItems] = useState<Record<number, string[]>>(() => {
        const map: Record<number, string[]> = {};
        for (let p = 1; p <= initial.paginas; p++) {
            map[p] = [];
        }
        for (const item of initial.items) {
            if (!map[item.pagina]) {
                map[item.pagina] = [];
            }
            map[item.pagina].push(item.producto_id);
        }

        return map;
    });

    const productoById = useMemo(() => {
        const map = new Map<string, BuilderProducto>();
        for (const p of productos) {
            map.set(p.id, p);
        }
        for (const item of initial.items) {
            if (item.producto) {
                map.set(item.producto.id, item.producto);
            }
        }

        return map;
    }, [productos, initial.items]);

    const currentIds = pageItems[page] ?? [];
    const usedOnPage = useMemo(() => new Set(currentIds), [currentIds]);

    const canvasEntries = useMemo(
        () =>
            currentIds
                .map((id) => productoById.get(id))
                .filter((p): p is BuilderProducto => Boolean(p))
                .map((producto) => ({ producto })),
        [currentIds, productoById],
    );

    const setIdsForPage = useCallback(
        (pagina: number, ids: string[]) => {
            setPageItems((prev) => ({ ...prev, [pagina]: ids }));
        },
        [],
    );

    const addProducto = (productoId: string) => {
        startTransition(() => {
            const incoming = productoById.get(productoId);
            const catId =
                incoming?.categoria?.id ?? incoming?.categoria_id ?? null;
            const without = currentIds.filter((id) => id !== productoId);

            // Inserta junto a la misma categoría para que el título de sección
            // quede agrupado (Entradas, Bebidas…).
            let insertAt = without.length;
            if (catId) {
                for (let i = without.length - 1; i >= 0; i -= 1) {
                    const p = productoById.get(without[i]!);
                    const other =
                        p?.categoria?.id ?? p?.categoria_id ?? null;
                    if (other === catId) {
                        insertAt = i + 1;
                        break;
                    }
                }
            }

            const next = [...without];
            next.splice(insertAt, 0, productoId);
            setIdsForPage(page, next);
        });
    };

    const saveAll = () => {
        setSaving(true);
        const pages: Record<string, string[]> = {};
        for (let p = 1; p <= paginas; p++) {
            pages[String(p)] = pageItems[p] ?? [];
        }

        router.patch(
            carta.menus.update(initial.id).url,
            {
                nombre,
                descripcion: initial.descripcion,
                fondo_preset: fondo,
                tipografia,
                color_texto: colorTexto.trim() || null,
                paginas,
                publicada,
                vigente_desde: vigenteDesde || null,
                vigente_hasta: vigenteHasta || null,
                dias_semana: diasSemana.length > 0 ? diasSemana : null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    // El flash de syncItems («Canvas guardado.») es el único toast.
                    router.put(
                        carta.menus.syncItems(initial.id).url,
                        { pages },
                        {
                            preserveScroll: true,
                            onFinish: () => setSaving(false),
                        },
                    );
                },
                onError: () => setSaving(false),
            },
        );
    };

    const printPdf = () => {
        window.open(carta.menus.pdf(initial.id).url, '_blank', 'noopener');
    };

    useEffect(() => {
        if (page > paginas) {
            setPage(paginas);
        }
    }, [page, paginas]);

    return (
        <>
            <Head title={`${t('builder.title')} · ${nombre}`} />

            <div className="flex flex-1 flex-col gap-4 p-3 sm:p-5">
                <PageHeader
                    title={nombre}
                    description={t('builder.editor_subtitle')}
                    action={
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="cursor-pointer gap-2"
                            >
                                <Link href={carta.menus.index().url}>
                                    <ArrowLeft className="size-4" />
                                    {t('builder.back_list')}
                                </Link>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer gap-2"
                                onClick={printPdf}
                            >
                                <FileDown className="size-4" />
                                <span className="hidden sm:inline">
                                    {t('builder.pdf')}
                                </span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="cursor-pointer gap-2"
                            >
                                <Link href={carta.menus.preview(initial.id).url}>
                                    <Eye className="size-4" />
                                    <span className="hidden sm:inline">
                                        {t('builder.preview')}
                                    </span>
                                </Link>
                            </Button>
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                disabled={saving}
                                onClick={saveAll}
                            >
                                {saving ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Save className="size-4" />
                                )}
                                {t('builder.save')}
                            </Button>
                        </div>
                    }
                />

                <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)_17rem]">
                    <div className="order-2 min-h-[18rem] lg:order-1 lg:min-h-0">
                        <CatalogPalette
                            productos={productos}
                            usedIds={usedOnPage}
                            onAdd={addProducto}
                        />
                    </div>

                    <div className="order-1 flex min-h-0 flex-col gap-3 lg:order-2">
                        <div className="flex flex-wrap items-center gap-2">
                            {Array.from({ length: paginas }, (_, i) => i + 1).map(
                                (p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() =>
                                            startTransition(() => setPage(p))
                                        }
                                        className={cn(
                                            'h-8 cursor-pointer rounded-lg border px-3 text-xs font-medium transition-all duration-300',
                                            page === p
                                                ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                                                : 'border-border/70 bg-background text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        {t('builder.page_tab', { page: p })}
                                    </button>
                                ),
                            )}
                            {paginas < 8 ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="cursor-pointer gap-1"
                                    onClick={() => {
                                        const next = paginas + 1;
                                        setPaginas(next);
                                        setPageItems((prev) => ({
                                            ...prev,
                                            [next]: prev[next] ?? [],
                                        }));
                                    }}
                                >
                                    <Plus className="size-3.5" />
                                    {t('builder.add_page')}
                                </Button>
                            ) : null}
                        </div>

                        <div
                            className={cn(
                                'min-h-0 flex-1 overflow-auto rounded-3xl bg-muted/30 p-3 sm:p-5 transition-opacity duration-500',
                                isPending && 'opacity-70',
                            )}
                        >
                            <MenuCanvas
                                title={nombre}
                                page={page}
                                pages={paginas}
                                fondo={fondo}
                                tipografia={tipografia}
                                colorTexto={colorTexto || null}
                                logoUrl={logo_url}
                                items={canvasEntries}
                                onDropProducto={addProducto}
                                onMove={(index, direction) => {
                                    const to = index + direction;
                                    if (to < 0 || to >= currentIds.length) {
                                        return;
                                    }
                                    setIdsForPage(
                                        page,
                                        reorder(currentIds, index, to),
                                    );
                                }}
                                onRemove={(productoId) =>
                                    setIdsForPage(
                                        page,
                                        currentIds.filter(
                                            (id) => id !== productoId,
                                        ),
                                    )
                                }
                                onReorder={(from, to) =>
                                    setIdsForPage(
                                        page,
                                        reorder(currentIds, from, to),
                                    )
                                }
                            />
                        </div>
                    </div>

                    <aside className="order-3 space-y-4 rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm">
                        <div className="space-y-2">
                            <label
                                htmlFor="menu-edit-nombre"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                {t('builder.fields.nombre')}
                            </label>
                            <Input
                                id="menu-edit-nombre"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                            />
                        </div>

                        <FondoPicker
                            value={fondo}
                            onChange={(v) =>
                                startTransition(() => setFondo(v))
                            }
                        />

                        <EstiloCartaControls
                            tipografia={tipografia}
                            colorTexto={colorTexto}
                            onTipografiaChange={(v) =>
                                startTransition(() => setTipografia(v))
                            }
                            onColorTextoChange={setColorTexto}
                        />

                        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border/60 p-3">
                            <Checkbox
                                checked={publicada}
                                onCheckedChange={(v) =>
                                    setPublicada(v === true)
                                }
                                className="mt-0.5"
                            />
                            <span className="text-sm">
                                <span className="font-medium">
                                    {t('builder.publish')}
                                </span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                    {t('builder.publish_hint')}
                                </span>
                            </span>
                        </label>

                        <div className="space-y-2 rounded-xl border border-border/60 p-3">
                            <p className="text-xs font-medium text-muted-foreground">
                                {t('builder.vigencia_title')}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label
                                        htmlFor="carta-desde"
                                        className="text-[11px] text-muted-foreground"
                                    >
                                        {t('builder.fields.vigente_desde')}
                                    </label>
                                    <Input
                                        id="carta-desde"
                                        type="date"
                                        value={vigenteDesde}
                                        onChange={(e) =>
                                            setVigenteDesde(e.target.value)
                                        }
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label
                                        htmlFor="carta-hasta"
                                        className="text-[11px] text-muted-foreground"
                                    >
                                        {t('builder.fields.vigente_hasta')}
                                    </label>
                                    <Input
                                        id="carta-hasta"
                                        type="date"
                                        value={vigenteHasta}
                                        onChange={(e) =>
                                            setVigenteHasta(e.target.value)
                                        }
                                        className="h-8"
                                    />
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                {t('builder.dias_hint')}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {DIAS.map((d) => {
                                    const on = diasSemana.includes(d.id);

                                    return (
                                        <button
                                            key={d.id}
                                            type="button"
                                            onClick={() =>
                                                setDiasSemana((prev) =>
                                                    on
                                                        ? prev.filter(
                                                              (x) => x !== d.id,
                                                          )
                                                        : [...prev, d.id].sort(
                                                              (a, b) => a - b,
                                                          ),
                                                )
                                            }
                                            className={cn(
                                                'h-7 cursor-pointer rounded-md border px-2 text-[11px] font-medium transition-colors',
                                                on
                                                    ? 'border-brand-600 bg-brand-600/10 text-brand-800'
                                                    : 'border-border/70 text-muted-foreground hover:bg-muted/50',
                                            )}
                                        >
                                            {d.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <MenuQrPanel
                            publicPath={public_path}
                            publicada={publicada}
                            logoUrl={logo_url}
                            downloadName={nombre || 'carta-qr'}
                        />

                        <Button
                            type="button"
                            className="w-full cursor-pointer gap-2"
                            disabled={saving}
                            onClick={saveAll}
                        >
                            {saving ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Check className="size-4" />
                            )}
                            {t('builder.save')}
                        </Button>
                    </aside>
                </div>
            </div>
        </>
    );
}

BuilderEdit.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Carta', href: '/carta' },
            { title: 'Armar', href: '/carta/armar' },
            { title: 'Canvas' },
        ]}
    >
        {page}
    </AppLayout>
);

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
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toastManager } from '@/lib/toast';
import AppLayout from '@/layouts/app-layout';
import carta from '../carta-routes';
import { CatalogPalette } from './components/catalog-palette';
import { FondoPicker } from './components/fondo-picker';
import { MenuCanvas } from './components/menu-canvas';
import { MenuQrPanel } from './components/menu-qr-panel';
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
    const [nombre, setNombre] = useState(initial.nombre);
    const [publicada, setPublicada] = useState(initial.publicada);
    const [paginas, setPaginas] = useState(initial.paginas);
    const [saving, setSaving] = useState(false);

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
            setIdsForPage(page, [
                ...currentIds.filter((id) => id !== productoId),
                productoId,
            ]);
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
                paginas,
                publicada,
                vigente_desde: initial.vigente_desde,
                vigente_hasta: initial.vigente_hasta,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    router.put(
                        carta.menus.syncItems(initial.id).url,
                        { pages },
                        {
                            preserveScroll: true,
                            onSuccess: () =>
                                toastManager.success({
                                    title: t('builder.saved'),
                                }),
                            onFinish: () => setSaving(false),
                        },
                    );
                },
                onError: () => setSaving(false),
            },
        );
    };

    const printPdf = () => {
        window.open(carta.menus.preview(initial.id).url, '_blank');
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

                        <MenuQrPanel
                            publicPath={public_path}
                            publicada={publicada}
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

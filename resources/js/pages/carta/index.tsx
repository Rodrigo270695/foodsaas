import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    FolderOpen,
    MoreHorizontal,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Tag,
    Trash2,
    UtensilsCrossed,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import { DataPagination, EmptyState, PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePlanLimitReached } from '@/hooks/use-plan-limits';
import { usePermission } from '@/hooks/use-permission';
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types';
import { CategoriaFormModal } from './components/categoria-form-modal';
import { ProductoCard } from './components/producto-card';
import { ProductoFormModal } from './components/producto-form-modal';
import carta from './carta-routes';
import type {
    CartaEstadoFilter,
    CartaFilters,
    CartaStats,
    CategoriaCarta,
    ProductoCarta,
} from './types';

type CartaIndexProps = {
    productos: Paginated<ProductoCarta>;
    categorias: CategoriaCarta[];
    filters: CartaFilters;
    stats: CartaStats;
    plan_productos_reached?: boolean;
};

type ModalState =
    | { type: 'idle' }
    | { type: 'product-create' }
    | { type: 'product-edit'; producto: ProductoCarta }
    | { type: 'category-create' }
    | { type: 'category-edit'; categoria: CategoriaCarta };

const DEFAULT_PER_PAGE = 12;
const DEFAULT_ESTADO: CartaEstadoFilter = 'todos';
const ALL_CATEGORIAS = '__all__';

function formatPrecio(value: string): string {
    const num = Number.parseFloat(value);
    if (Number.isNaN(num)) {
        return value;
    }

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(num);
}

export default function Index({
    productos: paginated,
    categorias,
    filters,
    stats,
    plan_productos_reached = false,
}: CartaIndexProps) {
    const { t } = useTranslation(['carta', 'common']);
    const { can } = usePermission();
    const canCreate = can('carta.create');
    const canUpdate = can('carta.update');
    const canDelete = can('carta.delete');
    const hookLimit = usePlanLimitReached('max_productos');
    const productosLimitReached = plan_productos_reached || hookLimit;

    const filtersWithSort: CartaFilters = {
        ...filters,
        sort: filters.sort ?? null,
        direction: filters.direction ?? null,
    };

    const { search, setSearch, isLoading, setPerPage, applyFilter, fetch } =
        useDataTablePage<{
            categoria_id: string | null;
            estado: CartaEstadoFilter;
        }>({
            routeUrl: carta.index().url,
            initialFilters: filtersWithSort,
            only: [
                'productos',
                'categorias',
                'filters',
                'stats',
                'plan_productos_reached',
            ],
            errorMessage: t('toast.load_error'),
            storageKey: 'foodsaas.carta.prefs',
            defaults: { per_page: DEFAULT_PER_PAGE },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const onCategoriaFilterChange = (value: string) => {
        applyFilter({
            categoria_id: value === ALL_CATEGORIAS ? null : value,
        });
    };

    const deleteProducto = (producto: ProductoCarta) => {
        if (
            !window.confirm(
                t('delete.product_confirm', { name: producto.nombre }),
            )
        ) {
            return;
        }

        router.delete(carta.productos.destroy(producto.id).url, {
            preserveScroll: true,
        });
    };

    const deleteCategoria = (categoria: CategoriaCarta) => {
        if (
            !window.confirm(
                t('delete.category_confirm', { name: categoria.nombre }),
            )
        ) {
            return;
        }

        router.delete(carta.categorias.destroy(categoria.id).url, {
            preserveScroll: true,
        });
    };

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.search) {
            count += 1;
        }
        if (filters.estado !== DEFAULT_ESTADO) {
            count += 1;
        }
        if (filters.categoria_id) {
            count += 1;
        }

        return count;
    }, [filters.search, filters.estado, filters.categoria_id]);

    const defaultCategoriaForProduct =
        filters.categoria_id ?? categorias.find((c) => c.activa)?.id ?? null;

    const categoriaChipValue = filters.categoria_id ?? ALL_CATEGORIAS;
    const inactivos = Math.max(0, stats.productos - stats.productos_activos);

    return (
        <>
            <Head title={t('title')} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('catalog.subtitle')}
                    action={
                        <div className="flex flex-row flex-wrap items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => fetch()}
                                disabled={isLoading}
                                aria-label={t('catalog.refresh')}
                                className="cursor-pointer"
                            >
                                <RefreshCw
                                    className={cn(
                                        'size-4',
                                        isLoading && 'animate-spin',
                                    )}
                                    strokeWidth={2.5}
                                />
                            </Button>
                            <Can permission="carta.create">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        setModal({ type: 'category-create' })
                                    }
                                    className="cursor-pointer gap-2"
                                >
                                    <FolderOpen
                                        className="size-4"
                                        strokeWidth={2.5}
                                    />
                                    <span className="hidden sm:inline">
                                        {t('actions.new_category')}
                                    </span>
                                </Button>
                            </Can>
                            <Can permission="carta.create">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex">
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    setModal({
                                                        type: 'product-create',
                                                    })
                                                }
                                                disabled={
                                                    productosLimitReached ||
                                                    categorias.length === 0
                                                }
                                                className="cursor-pointer gap-2"
                                            >
                                                <Plus
                                                    className="size-4"
                                                    strokeWidth={2.5}
                                                />
                                                <span className="hidden sm:inline">
                                                    {t('actions.new_product')}
                                                </span>
                                                <span className="sm:hidden">
                                                    {t(
                                                        'actions.new_product_short',
                                                    )}
                                                </span>
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    {productosLimitReached ? (
                                        <TooltipContent
                                            side="bottom"
                                            className="max-w-xs"
                                        >
                                            {t('plan_limit.max_productos')}
                                        </TooltipContent>
                                    ) : categorias.length === 0 ? (
                                        <TooltipContent
                                            side="bottom"
                                            className="max-w-xs"
                                        >
                                            {t('producto_form.no_categories')}
                                        </TooltipContent>
                                    ) : null}
                                </Tooltip>
                            </Can>
                        </div>
                    }
                />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                onCategoriaFilterChange(ALL_CATEGORIAS)
                            }
                            className={cn(
                                'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                                categoriaChipValue === ALL_CATEGORIAS
                                    ? 'border-brand-600 bg-brand-600 text-white'
                                    : 'border-border/70 bg-background text-foreground hover:bg-muted/50',
                            )}
                        >
                            {t('filters.all')}
                            <span className="tabular-nums opacity-80">
                                {stats.productos}
                            </span>
                        </button>
                        {categorias.map((cat) => (
                            <div
                                key={cat.id}
                                className="inline-flex items-center gap-0.5"
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        onCategoriaFilterChange(
                                            filters.categoria_id === cat.id
                                                ? ALL_CATEGORIAS
                                                : cat.id,
                                        )
                                    }
                                    className={cn(
                                        'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                                        filters.categoria_id === cat.id
                                            ? 'border-brand-600 bg-brand-600 text-white'
                                            : 'border-border/70 bg-background text-foreground hover:bg-muted/50',
                                        !cat.activa && 'opacity-60',
                                    )}
                                >
                                    {cat.nombre}
                                    <span className="tabular-nums opacity-80">
                                        {cat.productos_count ?? 0}
                                    </span>
                                </button>
                                {(canUpdate || canDelete) && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={t(
                                                    'row.actions_for_category',
                                                    { name: cat.nombre },
                                                )}
                                                className="size-8 cursor-pointer"
                                            >
                                                <MoreHorizontal className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="w-44"
                                        >
                                            {canUpdate ? (
                                                <DropdownMenuItem
                                                    onSelect={() =>
                                                        setModal({
                                                            type: 'category-edit',
                                                            categoria: cat,
                                                        })
                                                    }
                                                    className="cursor-pointer gap-2"
                                                >
                                                    <Pencil className="size-4" />
                                                    {t('common:actions.edit')}
                                                </DropdownMenuItem>
                                            ) : null}
                                            {canDelete ? (
                                                <DropdownMenuItem
                                                    onSelect={() =>
                                                        deleteCategoria(cat)
                                                    }
                                                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="size-4" />
                                                    {t('common:actions.delete')}
                                                </DropdownMenuItem>
                                            ) : null}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden
                            />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('search_placeholder')}
                                className="h-9 pl-9"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                                <UtensilsCrossed className="size-3.5" />
                                {t('catalog.stat_total', {
                                    count: stats.productos,
                                })}
                            </span>
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="size-3.5" />
                                {t('catalog.stat_active', {
                                    count: stats.productos_activos,
                                })}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                {t('catalog.stat_inactive', {
                                    count: inactivos,
                                })}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <FolderOpen className="size-3.5" />
                                {t('catalog.stat_categories', {
                                    count: stats.categorias,
                                })}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <Tag className="size-3.5" />
                                {t('catalog.stat_matches', {
                                    count: stats.coincidencias,
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {(
                        [
                            ['todos', t('filters.all')],
                            ['activos', t('filters.active')],
                            ['inactivos', t('filters.inactive')],
                        ] as const
                    ).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() =>
                                applyFilter({
                                    estado: value as CartaEstadoFilter,
                                })
                            }
                            className={cn(
                                'h-8 cursor-pointer rounded-lg border px-2.5 text-xs font-medium transition-colors',
                                filters.estado === value
                                    ? 'border-brand-600/40 bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200'
                                    : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {categorias.length === 0 ? (
                    <EmptyState
                        icon={FolderOpen}
                        title={t('empty.no_categories_title')}
                        description={t('empty.no_categories_description')}
                        action={
                            canCreate ? (
                                <Button
                                    type="button"
                                    onClick={() =>
                                        setModal({ type: 'category-create' })
                                    }
                                    className="cursor-pointer gap-2"
                                >
                                    <Plus className="size-4" strokeWidth={2.5} />
                                    {t('actions.create_first_category')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : paginated.data.length === 0 ? (
                    <EmptyState
                        icon={UtensilsCrossed}
                        title={
                            activeFiltersCount > 0
                                ? t('empty.no_results_title')
                                : t('empty.no_products_title')
                        }
                        description={
                            activeFiltersCount > 0
                                ? t('empty.no_results_description')
                                : t('empty.no_products_description')
                        }
                        action={
                            activeFiltersCount === 0 && canCreate ? (
                                <Button
                                    type="button"
                                    onClick={() =>
                                        setModal({ type: 'product-create' })
                                    }
                                    disabled={productosLimitReached}
                                    className="cursor-pointer gap-2"
                                >
                                    <Plus
                                        className="size-4"
                                        strokeWidth={2.5}
                                    />
                                    {t('actions.create_first_product')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        <div
                            className={cn(
                                'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                                isLoading &&
                                    'pointer-events-none opacity-60',
                            )}
                            role="status"
                            aria-live="polite"
                            aria-label={t('aria.results_count_other', {
                                count: stats.coincidencias,
                            })}
                        >
                            {paginated.data.map((producto, index) => (
                                <div
                                    key={producto.id}
                                    className="animate-in fade-in zoom-in-95 fill-mode-both duration-300"
                                    style={{
                                        animationDelay: `${Math.min(index, 12) * 40}ms`,
                                    }}
                                >
                                    <ProductoCard
                                        producto={producto}
                                        priceLabel={formatPrecio(
                                            producto.precio,
                                        )}
                                        canUpdate={canUpdate}
                                        canDelete={canDelete}
                                        onEdit={(p) =>
                                            setModal({
                                                type: 'product-edit',
                                                producto: p,
                                            })
                                        }
                                        onDelete={deleteProducto}
                                    />
                                </div>
                            ))}
                        </div>

                        <DataPagination
                            meta={paginated}
                            onPerPageChange={setPerPage}
                            preservedQuery={{
                                search: filters.search || undefined,
                                per_page: filters.per_page,
                                categoria_id:
                                    filters.categoria_id ?? undefined,
                                estado:
                                    filters.estado !== DEFAULT_ESTADO
                                        ? filters.estado
                                        : undefined,
                            }}
                        />
                    </>
                )}
            </div>

            <CategoriaFormModal
                open={
                    modal.type === 'category-create' ||
                    modal.type === 'category-edit'
                }
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                categoria={
                    modal.type === 'category-edit' ? modal.categoria : null
                }
            />

            <ProductoFormModal
                open={
                    modal.type === 'product-create' ||
                    modal.type === 'product-edit'
                }
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                producto={
                    modal.type === 'product-edit' ? modal.producto : null
                }
                categorias={categorias}
                defaultCategoriaId={defaultCategoriaForProduct}
            />
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Carta', href: '/carta' },
        ]}
    >
        {page}
    </AppLayout>
);

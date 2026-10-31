import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    FolderOpen,
    LayoutGrid,
    MoreHorizontal,
    Pencil,
    Plus,
    Tag,
    Trash2,
    UtensilsCrossed,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ActiveSedeOption } from '@/components/active-sede-switcher';
import { CopyToSedeModal } from '@/components/copy-to-sede-modal';
import {
    DataPagination,
    DataTable,
    EmptyState,
    PageHeader,
    StatBadge,
    type DataTableColumn,
} from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePlanLimitReached } from '@/hooks/use-plan-limits';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types';
import { CartaHeaderActions } from './components/carta-header-actions';
import { CartaToolbar } from './components/carta-toolbar';
import { CategoriaFormModal } from './components/categoria-form-modal';
import { ProductoFormModal } from './components/producto-form-modal';
import carta from './carta-routes';
import { formatPrecio } from './lib/format-precio';
import type {
    AreaCarta,
    CartaEstadoFilter,
    CartaFilters,
    CartaStats,
    CategoriaCarta,
    ProductoCarta,
} from './types';

type CartaIndexProps = {
    productos: Paginated<ProductoCarta>;
    categorias: CategoriaCarta[];
    areas: AreaCarta[];
    filters: CartaFilters;
    stats: CartaStats;
    plan_productos_reached?: boolean;
    copy_targets?: ActiveSedeOption[];
    /** Siguiente orden de producto por categoría. */
    next_producto_orden_by_categoria?: Record<string, number>;
    /** Siguiente orden al crear categoría. */
    next_categoria_orden?: number;
};

type ModalState =
    | { type: 'idle' }
    | { type: 'product-create' }
    | { type: 'product-edit'; producto: ProductoCarta }
    | { type: 'product-delete'; producto: ProductoCarta }
    | { type: 'category-create' }
    | { type: 'category-edit'; categoria: CategoriaCarta }
    | { type: 'category-delete'; categoria: CategoriaCarta };

const DEFAULT_PER_PAGE = 12;
const DEFAULT_ESTADO: CartaEstadoFilter = 'todos';

export default function Index({
    productos: paginated,
    categorias,
    areas,
    filters,
    stats,
    plan_productos_reached = false,
    copy_targets = [],
    next_producto_orden_by_categoria = {},
    next_categoria_orden = 1,
}: CartaIndexProps) {
    const { t } = useTranslation(['carta', 'common']);
    const { can } = usePermission();
    const canManageProductos = can('carta.manage-productos');
    const canManageCategorias = can('carta.manage-categorias');
    const showRowActions = canManageProductos;
    const hookLimit = usePlanLimitReached('max_productos');
    const productosLimitReached = plan_productos_reached || hookLimit;
    const [copyOpen, setCopyOpen] = useState(false);

    const filtersWithSort: CartaFilters = {
        ...filters,
        sort: filters.sort ?? null,
        direction: filters.direction ?? null,
        area_id: filters.area_id ?? null,
    };

    const { search, setSearch, isLoading, setPerPage, applyFilter, fetch } =
        useDataTablePage<{
            categoria_id: string | null;
            area_id: string | null;
            estado: CartaEstadoFilter;
        }>({
            routeUrl: carta.index().url,
            initialFilters: filtersWithSort,
            only: [
                'productos',
                'categorias',
                'areas',
                'filters',
                'stats',
                'plan_productos_reached',
                'copy_targets',
                'next_producto_orden_by_categoria',
                'next_categoria_orden',
            ],
            errorMessage: t('toast.load_error'),
            storageKey: 'foodsaas.carta.prefs',
            defaults: { per_page: DEFAULT_PER_PAGE },
        });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const askDeleteProducto = useCallback((producto: ProductoCarta) => {
        setModal({ type: 'product-delete', producto });
    }, []);

    const askDeleteCategoria = useCallback((categoria: CategoriaCarta) => {
        setModal({ type: 'category-delete', categoria });
    }, []);

    const hasActiveFilters = useMemo(
        () =>
            Boolean(filters.search) ||
            filters.estado !== DEFAULT_ESTADO ||
            Boolean(filters.categoria_id) ||
            Boolean(filters.area_id),
        [
            filters.search,
            filters.estado,
            filters.categoria_id,
            filters.area_id,
        ],
    );

    const defaultCategoriaForProduct =
        filters.categoria_id ?? categorias.find((c) => c.activa)?.id ?? null;

    const columns = useMemo<DataTableColumn<ProductoCarta>[]>(() => {
        const base: DataTableColumn<ProductoCarta>[] = [
            {
                key: 'nombre',
                header: t('columns.nombre'),
                cell: (producto) => (
                    <div className="flex items-center gap-3">
                        <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                            {producto.imagen_url ? (
                                <img
                                    src={producto.imagen_url}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            ) : (
                                <div className="flex size-full items-center justify-center text-muted-foreground">
                                    <UtensilsCrossed className="size-4" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                                {producto.nombre}
                            </p>
                            {producto.descripcion ? (
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                    {producto.descripcion}
                                </p>
                            ) : null}
                        </div>
                    </div>
                ),
            },
            {
                key: 'categoria',
                header: t('columns.categoria'),
                cell: (producto) => (
                    <span className="text-sm">
                        {producto.categoria?.nombre ?? '—'}
                    </span>
                ),
                className: 'hidden md:table-cell',
            },
            {
                key: 'area',
                header: t('columns.area'),
                cell: (producto) => (
                    <span className="text-sm text-muted-foreground">
                        {producto.area?.nombre ?? t('row.no_area')}
                    </span>
                ),
                className: 'hidden lg:table-cell',
            },
            {
                key: 'precio',
                header: t('columns.precio'),
                align: 'right',
                cell: (producto) => (
                    <span className="tabular-nums text-sm font-semibold text-brand-700 dark:text-brand-300">
                        {formatPrecio(producto.precio)}
                    </span>
                ),
            },
            {
                key: 'stock',
                header: t('columns.stock'),
                cell: (producto) => {
                    const control = producto.control_inventario ?? 'none';
                    if (control === 'none') {
                        return (
                            <span className="text-xs text-muted-foreground">
                                {t('stock.none')}
                            </span>
                        );
                    }
                    if (control === 'recipe') {
                        return (
                            <StatBadge
                                label={t('stock.recipe')}
                                value=""
                                variant="muted"
                            />
                        );
                    }
                    return (
                        <span className="tabular-nums text-sm font-medium">
                            {producto.stock ?? '0'}
                        </span>
                    );
                },
                className: 'hidden md:table-cell',
            },
            {
                key: 'estado',
                header: t('columns.estado'),
                cell: (producto) =>
                    producto.activo ? (
                        <StatBadge
                            label={t('row.active')}
                            value=""
                            variant="success"
                        />
                    ) : (
                        <StatBadge
                            label={t('row.inactive')}
                            value=""
                            variant="muted"
                        />
                    ),
            },
        ];

        if (showRowActions) {
            base.push({
                key: 'acciones',
                header: (
                    <span className="md:sr-only">{t('columns.acciones')}</span>
                ),
                align: 'right',
                cell: (producto) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t('row.actions_for_product', {
                                    name: producto.nombre,
                                })}
                                className="size-8 cursor-pointer"
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                                onSelect={() =>
                                    setModal({
                                        type: 'product-edit',
                                        producto,
                                    })
                                }
                                className="cursor-pointer gap-2"
                            >
                                <Pencil className="size-4" />
                                {t('common:actions.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => askDeleteProducto(producto)}
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                            >
                                <Trash2 className="size-4" />
                                {t('common:actions.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
                className: 'w-12',
            });
        }

        return base;
    }, [t, showRowActions, askDeleteProducto]);

    return (
        <>
            <Head title={t('title')} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('catalog.subtitle')}
                    stats={[
                        {
                            label: t('stats_badges.total', {
                                defaultValue: 'Total',
                            }),
                            value: stats.productos,
                            variant: 'info',
                            icon: UtensilsCrossed,
                        },
                        {
                            label: t('stats_badges.active', {
                                defaultValue: 'Activos',
                            }),
                            value: stats.productos_activos,
                            variant: 'success',
                            icon: CheckCircle2,
                        },
                        {
                            label: t('stats_badges.inactive', {
                                defaultValue: 'Inactivos',
                            }),
                            value: Math.max(
                                0,
                                stats.productos - stats.productos_activos,
                            ),
                            variant: 'muted',
                            hideOnMobile: true,
                        },
                        {
                            label: t('stats_badges.categories', {
                                defaultValue: 'Categorías',
                            }),
                            value: stats.categorias,
                            variant: 'warning',
                            icon: FolderOpen,
                            hideOnMobile: true,
                        },
                        {
                            label: t('stats_badges.areas', {
                                defaultValue: 'Áreas',
                            }),
                            value: stats.areas ?? 0,
                            variant: 'primary',
                            icon: LayoutGrid,
                            hideOnMobile: true,
                        },
                        {
                            label: t('stats_badges.matches', {
                                defaultValue: 'Coincidencias',
                            }),
                            value: stats.coincidencias,
                            variant: 'primary',
                            icon: Tag,
                        },
                    ]}
                    action={
                        <CartaHeaderActions
                            isLoading={isLoading}
                            productosLimitReached={productosLimitReached}
                            hasCategorias={categorias.length > 0}
                            canCopy={
                                canManageProductos && copy_targets.length > 0
                            }
                            exportHref={(() => {
                                const params = new URLSearchParams();
                                if (filters.search) {
                                    params.set('search', filters.search);
                                }
                                if (filters.categoria_id) {
                                    params.set(
                                        'categoria_id',
                                        filters.categoria_id,
                                    );
                                }
                                if (filters.estado !== DEFAULT_ESTADO) {
                                    params.set('estado', filters.estado);
                                }
                                const qs = params.toString();
                                return `${carta.export().url}${qs ? `?${qs}` : ''}`;
                            })()}
                            onRefresh={() => fetch()}
                            onCopy={() => setCopyOpen(true)}
                            onNewCategory={() =>
                                setModal({ type: 'category-create' })
                            }
                            onNewProduct={() =>
                                setModal({ type: 'product-create' })
                            }
                        />
                    }
                />

                <CartaToolbar
                    categorias={categorias}
                    stats={stats}
                    categoriaId={filters.categoria_id}
                    estado={filters.estado}
                    search={search}
                    isSearching={isLoading}
                    canManageCategorias={canManageCategorias}
                    onCategoriaChange={(categoria_id) =>
                        applyFilter({ categoria_id })
                    }
                    onEstadoChange={(estado) => applyFilter({ estado })}
                    onSearchChange={setSearch}
                    onEditCategoria={(categoria) =>
                        setModal({ type: 'category-edit', categoria })
                    }
                    onDeleteCategoria={askDeleteCategoria}
                />

                {categorias.length === 0 ? (
                    <EmptyState
                        icon={FolderOpen}
                        title={t('empty.no_categories_title')}
                        description={t('empty.no_categories_description')}
                        action={
                            canManageCategorias ? (
                                <Button
                                    type="button"
                                    onClick={() =>
                                        setModal({ type: 'category-create' })
                                    }
                                    className="cursor-pointer gap-2"
                                >
                                    <Plus className="size-4" />
                                    {t('actions.create_first_category')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <DataTable
                        columns={columns}
                        data={paginated.data}
                        rowKey={(p) => p.id}
                        isLoading={isLoading}
                        ariaLiveMessage={t('aria.results_count_other', {
                            count: stats.coincidencias,
                        })}
                        footer={
                            <DataPagination
                                meta={paginated}
                                onPerPageChange={setPerPage}
                                perPageOptions={[10, 12, 15, 20, 25, 50]}
                                preservedQuery={{
                                    search: filters.search || undefined,
                                    per_page: filters.per_page,
                                    categoria_id:
                                        filters.categoria_id ?? undefined,
                                    area_id: filters.area_id ?? undefined,
                                    estado:
                                        filters.estado !== DEFAULT_ESTADO
                                            ? filters.estado
                                            : undefined,
                                }}
                            />
                        }
                        emptyState={
                            <EmptyState
                                icon={UtensilsCrossed}
                                title={
                                    hasActiveFilters
                                        ? t('empty.no_results_title')
                                        : t('empty.no_products_title')
                                }
                                description={
                                    hasActiveFilters
                                        ? t('empty.no_results_description')
                                        : t('empty.no_products_description')
                                }
                                action={
                                    !hasActiveFilters && canManageProductos ? (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                setModal({
                                                    type: 'product-create',
                                                })
                                            }
                                            disabled={productosLimitReached}
                                            className="cursor-pointer gap-2"
                                        >
                                            <Plus className="size-4" />
                                            {t('actions.create_first_product')}
                                        </Button>
                                    ) : undefined
                                }
                            />
                        }
                    />
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
                suggestedOrden={next_categoria_orden}
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
                areas={areas}
                defaultCategoriaId={defaultCategoriaForProduct}
                nextOrdenByCategoria={next_producto_orden_by_categoria}
            />

            <CopyToSedeModal
                open={copyOpen}
                onOpenChange={setCopyOpen}
                targets={copy_targets}
                actionUrl={carta.copyToSede().url}
                title={t('copy.title', {
                    defaultValue: 'Copiar carta a otra sede',
                })}
                description={t('copy.description', {
                    defaultValue:
                        'Copia categorías, áreas, productos y cartas publicables. No duplica lo que ya exista con el mismo nombre.',
                })}
            />

            <ConfirmDeleteDialog
                open={modal.type === 'product-delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                title={t('delete.product_title')}
                description={t('delete.product_confirm', {
                    name:
                        modal.type === 'product-delete'
                            ? modal.producto.nombre
                            : '',
                })}
                deleteUrl={
                    modal.type === 'product-delete'
                        ? carta.productos.destroy(modal.producto.id).url
                        : null
                }
                loadingLabel={t('delete.deleting')}
            />

            <ConfirmDeleteDialog
                open={modal.type === 'category-delete'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                title={t('delete.category_title')}
                description={t('delete.category_confirm', {
                    name:
                        modal.type === 'category-delete'
                            ? modal.categoria.nombre
                            : '',
                })}
                deleteUrl={
                    modal.type === 'category-delete'
                        ? carta.categorias.destroy(modal.categoria.id).url
                        : null
                }
                loadingLabel={t('delete.deleting')}
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

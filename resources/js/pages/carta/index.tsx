import { Head, router } from '@inertiajs/react';
import { FolderOpen, Plus, UtensilsCrossed } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataPagination, EmptyState, PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePlanLimitReached } from '@/hooks/use-plan-limits';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types';
import { CartaHeaderActions } from './components/carta-header-actions';
import { CartaToolbar } from './components/carta-toolbar';
import { CategoriaFormModal } from './components/categoria-form-modal';
import { ProductoFormModal } from './components/producto-form-modal';
import { ProductosGrid } from './components/productos-grid';
import carta from './carta-routes';
import { formatPrecio } from './lib/format-precio';
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

export default function Index({
    productos: paginated,
    categorias,
    filters,
    stats,
    plan_productos_reached = false,
}: CartaIndexProps) {
    const { t } = useTranslation('carta');
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

    const deleteProducto = useCallback(
        (producto: ProductoCarta) => {
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
        },
        [t],
    );

    const deleteCategoria = useCallback(
        (categoria: CategoriaCarta) => {
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
        },
        [t],
    );

    const hasActiveFilters = useMemo(() => {
        return (
            Boolean(filters.search) ||
            filters.estado !== DEFAULT_ESTADO ||
            Boolean(filters.categoria_id)
        );
    }, [filters.search, filters.estado, filters.categoria_id]);

    const defaultCategoriaForProduct =
        filters.categoria_id ?? categorias.find((c) => c.activa)?.id ?? null;

    return (
        <>
            <Head title={t('title')} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('catalog.subtitle')}
                    action={
                        <CartaHeaderActions
                            isLoading={isLoading}
                            productosLimitReached={productosLimitReached}
                            hasCategorias={categorias.length > 0}
                            onRefresh={() => fetch()}
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
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    onCategoriaChange={(categoria_id) =>
                        applyFilter({ categoria_id })
                    }
                    onEstadoChange={(estado) => applyFilter({ estado })}
                    onSearchChange={setSearch}
                    onEditCategoria={(categoria) =>
                        setModal({ type: 'category-edit', categoria })
                    }
                    onDeleteCategoria={deleteCategoria}
                />

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
                            !hasActiveFilters && canCreate ? (
                                <Button
                                    type="button"
                                    onClick={() =>
                                        setModal({ type: 'product-create' })
                                    }
                                    disabled={productosLimitReached}
                                    className="cursor-pointer gap-2"
                                >
                                    <Plus className="size-4" strokeWidth={2.5} />
                                    {t('actions.create_first_product')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        <ProductosGrid
                            productos={paginated.data}
                            isLoading={isLoading}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                            ariaLabel={t('aria.results_count_other', {
                                count: stats.coincidencias,
                            })}
                            formatPrice={formatPrecio}
                            onEdit={(producto) =>
                                setModal({ type: 'product-edit', producto })
                            }
                            onDelete={deleteProducto}
                        />

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

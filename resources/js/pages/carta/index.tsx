import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    FolderOpen,
    MoreHorizontal,
    Pencil,
    Plus,
    Tag,
    Trash2,
    UtensilsCrossed,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    FilterChips,
    PageHeader,
    StatBadge,
} from '@/components/data-page';
import type { DataTableColumn, FilterChip } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePlanLimitReached } from '@/hooks/use-plan-limits';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types';
import { CategoriaFormModal } from './components/categoria-form-modal';
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

const DEFAULT_PER_PAGE = 10;
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
    const showRowActions = canUpdate || canDelete;
    const hookLimit = usePlanLimitReached('max_productos');
    const productosLimitReached = plan_productos_reached || hookLimit;

    const filtersWithSort: CartaFilters = {
        ...filters,
        sort: filters.sort ?? null,
        direction: filters.direction ?? null,
    };

    const {
        search,
        setSearch,
        isLoading,
        setPerPage,
        applyFilter,
    } = useDataTablePage<{
        categoria_id: string | null;
        estado: CartaEstadoFilter;
    }>({
        routeUrl: carta.index().url,
        initialFilters: filtersWithSort,
        only: ['productos', 'categorias', 'filters', 'stats', 'plan_productos_reached'],
        errorMessage: t('toast.load_error'),
        storageKey: 'foodsaas.carta.prefs',
        defaults: { per_page: DEFAULT_PER_PAGE },
    });

    const estadoOptions: readonly FilterChip<CartaEstadoFilter>[] = useMemo(
        () => [
            { value: 'todos', label: t('filters.all') },
            { value: 'activos', label: t('filters.active') },
            { value: 'inactivos', label: t('filters.inactive') },
        ],
        [t],
    );

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const categoriaSelectValue =
        filters.categoria_id && filters.categoria_id !== ''
            ? filters.categoria_id
            : ALL_CATEGORIAS;

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
        if (filters.per_page !== DEFAULT_PER_PAGE) {
            count += 1;
        }

        return count;
    }, [
        filters.search,
        filters.estado,
        filters.categoria_id,
        filters.per_page,
    ]);

    const columns = useMemo<DataTableColumn<ProductoCarta>[]>(() => {
        const base: DataTableColumn<ProductoCarta>[] = [
            {
                key: 'nombre',
                header: t('columns.nombre'),
                cell: (producto) => (
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                            {producto.nombre}
                        </span>
                        {producto.descripcion ? (
                            <span className="line-clamp-1 text-xs text-muted-foreground">
                                {producto.descripcion}
                            </span>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'categoria',
                header: t('columns.categoria'),
                cell: (producto) => (
                    <span className="text-sm text-foreground/90">
                        {producto.categoria?.nombre ?? '—'}
                    </span>
                ),
            },
            {
                key: 'codigo',
                header: t('columns.codigo'),
                cell: (producto) =>
                    producto.codigo ? (
                        <span className="font-mono text-xs">{producto.codigo}</span>
                    ) : (
                        <span className="text-xs text-muted-foreground">
                            {t('row.no_code')}
                        </span>
                    ),
                className: 'hidden sm:table-cell',
            },
            {
                key: 'precio',
                header: t('columns.precio'),
                align: 'right',
                cell: (producto) => (
                    <span className="tabular-nums text-sm font-medium">
                        {formatPrecio(producto.precio)}
                    </span>
                ),
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
                                <MoreHorizontal className="size-4" strokeWidth={2.5} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {canUpdate ? (
                                <DropdownMenuItem
                                    onSelect={() =>
                                        setModal({
                                            type: 'product-edit',
                                            producto,
                                        })
                                    }
                                    className="cursor-pointer gap-2"
                                >
                                    <Pencil className="size-4" strokeWidth={2.25} />
                                    {t('common:actions.edit')}
                                </DropdownMenuItem>
                            ) : null}
                            {canDelete ? (
                                <DropdownMenuItem
                                    onSelect={() => deleteProducto(producto)}
                                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="size-4" strokeWidth={2.25} />
                                    {t('common:actions.delete')}
                                </DropdownMenuItem>
                            ) : null}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
                className: 'w-12',
            });
        }

        return base;
    }, [t, showRowActions, canUpdate, canDelete]);

    const defaultCategoriaForProduct =
        filters.categoria_id ?? categorias.find((c) => c.activa)?.id ?? null;

    return (
        <>
            <Head title={t('title')} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('description')}
                    stats={[
                        {
                            label: t('stats.productos'),
                            value: stats.productos,
                            variant: 'info',
                            icon: UtensilsCrossed,
                        },
                        {
                            label: t('stats.activos'),
                            value: stats.productos_activos,
                            variant: 'success',
                            icon: CheckCircle2,
                        },
                        {
                            label: t('stats.categorias'),
                            value: stats.categorias,
                            variant: 'primary',
                            icon: FolderOpen,
                        },
                        {
                            label: t('stats.matches'),
                            value: stats.coincidencias,
                            variant: 'warning',
                            icon: Tag,
                        },
                    ]}
                    action={
                        <div className="flex flex-row flex-wrap items-center justify-end gap-2">
                            <Can permission="carta.create">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        setModal({ type: 'category-create' })
                                    }
                                    className="cursor-pointer gap-2"
                                >
                                    <Plus className="size-4" strokeWidth={2.5} />
                                    <span className="hidden sm:inline">
                                        {t('actions.new_category')}
                                    </span>
                                    <span className="sm:hidden">
                                        {t('actions.new_category_short')}
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
                                                    {t('actions.new_product_short')}
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

                <section className="rounded-xl border border-border/60 bg-card/30 p-4">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">
                                {t('sections.categories')}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {t('sections.categories_hint')}
                            </p>
                        </div>
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
                    ) : (
                        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {categorias.map((cat) => (
                                <li
                                    key={cat.id}
                                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                                        filters.categoria_id === cat.id
                                            ? 'border-primary/50 bg-primary/5'
                                            : 'border-border/60 bg-background/40 hover:bg-muted/30'
                                    }`}
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
                                        className="min-w-0 flex-1 cursor-pointer text-left"
                                    >
                                        <span className="block truncate text-sm font-medium">
                                            {cat.nombre}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {(cat.productos_count ?? 0) === 1
                                                ? t('row.products_count_one')
                                                : t('row.products_count', {
                                                      count:
                                                          cat.productos_count ?? 0,
                                                  })}
                                            {!cat.activa
                                                ? ` · ${t('row.inactive')}`
                                                : ''}
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
                                                    className="size-8 shrink-0 cursor-pointer"
                                                >
                                                    <MoreHorizontal
                                                        className="size-4"
                                                        strokeWidth={2.5}
                                                    />
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
                                                        <Pencil
                                                            className="size-4"
                                                            strokeWidth={2.25}
                                                        />
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
                                                        <Trash2
                                                            className="size-4"
                                                            strokeWidth={2.25}
                                                        />
                                                        {t('common:actions.delete')}
                                                    </DropdownMenuItem>
                                                ) : null}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(p) => p.id}
                    isLoading={isLoading}
                    ariaLiveMessage={t('aria.results_count_other', {
                        count: stats.coincidencias,
                    })}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder={t('search_placeholder')}
                        >
                            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                                <Select
                                    value={categoriaSelectValue}
                                    onValueChange={onCategoriaFilterChange}
                                >
                                    <SelectTrigger
                                        aria-label={t('category_filter_label')}
                                        className="h-9 w-full sm:w-[200px]"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL_CATEGORIAS}>
                                            {t('category_all')}
                                        </SelectItem>
                                        {categorias.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FilterChips
                                    ariaLabel={t('filter_label')}
                                    value={filters.estado}
                                    onChange={(estado) => applyFilter({ estado })}
                                    options={estadoOptions}
                                />
                            </div>
                        </DataToolbar>
                    }
                    footer={
                        <DataPagination
                            meta={paginated}
                            onPerPageChange={setPerPage}
                            preservedQuery={{
                                search: filters.search || undefined,
                                per_page: filters.per_page,
                                categoria_id: filters.categoria_id ?? undefined,
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
                                activeFiltersCount === 0 &&
                                canCreate &&
                                categorias.length > 0 ? (
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
                    }
                />
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

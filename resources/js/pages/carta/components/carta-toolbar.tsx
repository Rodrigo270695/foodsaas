import {
    CheckCircle2,
    FolderOpen,
    LayoutGrid,
    Tag,
    UtensilsCrossed,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    InlineStats,
    ScrollableEntityFilters,
    SearchField,
    StatusPills,
} from '@/components/data-page';
import type {
    CartaEstadoFilter,
    CartaStats,
    CategoriaCarta,
} from '../types';

type CartaToolbarProps = {
    categorias: CategoriaCarta[];
    stats: CartaStats;
    categoriaId: string | null;
    estado: CartaEstadoFilter;
    search: string;
    isSearching?: boolean;
    canManageCategorias: boolean;
    onCategoriaChange: (categoriaId: string | null) => void;
    onEstadoChange: (estado: CartaEstadoFilter) => void;
    onSearchChange: (search: string) => void;
    onEditCategoria: (categoria: CategoriaCarta) => void;
    onDeleteCategoria: (categoria: CategoriaCarta) => void;
};

export function CartaToolbar({
    categorias,
    stats,
    categoriaId,
    estado,
    search,
    isSearching = false,
    canManageCategorias,
    onCategoriaChange,
    onEstadoChange,
    onSearchChange,
    onEditCategoria,
    onDeleteCategoria,
}: CartaToolbarProps) {
    const { t } = useTranslation(['carta', 'common']);
    const inactivos = Math.max(0, stats.productos - stats.productos_activos);
    const areasCount = stats.areas ?? 0;

    const entityItems = useMemo(
        () =>
            categorias.map((cat) => ({
                id: cat.id,
                label: cat.nombre,
                count: cat.productos_count ?? 0,
                muted: !cat.activa,
            })),
        [categorias],
    );

    const estadoOptions = useMemo(
        () =>
            [
                { value: 'todos' as const, label: t('filters.all') },
                { value: 'activos' as const, label: t('filters.active') },
                { value: 'inactivos' as const, label: t('filters.inactive') },
            ] as const,
        [t],
    );

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <ScrollableEntityFilters
                    aria-label={t('category_filter_label')}
                    items={entityItems}
                    value={categoriaId}
                    allLabel={t('filters.all')}
                    allCount={stats.productos}
                    onChange={onCategoriaChange}
                    searchPlaceholder={t('category_search', {
                        defaultValue: 'Buscar categoría…',
                    })}
                    canManage={canManageCategorias}
                    manageLabel={(name) =>
                        t('row.actions_for_category', { name })
                    }
                    onEdit={(id) => {
                        const cat = categorias.find((c) => c.id === id);
                        if (cat) {
                            onEditCategoria(cat);
                        }
                    }}
                    onDelete={(id) => {
                        const cat = categorias.find((c) => c.id === id);
                        if (cat) {
                            onDeleteCategoria(cat);
                        }
                    }}
                    editLabel={t('common:actions.edit')}
                    deleteLabel={t('common:actions.delete')}
                    className="min-w-0 flex-1"
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <SearchField
                        value={search}
                        onValueChange={onSearchChange}
                        placeholder={t('search_placeholder')}
                        isSearching={isSearching}
                        className="flex-1 sm:max-w-xs"
                    />
                    <InlineStats
                        items={[
                            {
                                key: 'total',
                                icon: UtensilsCrossed,
                                label: t('catalog.stat_total', {
                                    count: stats.productos,
                                }),
                            },
                            {
                                key: 'active',
                                icon: CheckCircle2,
                                tone: 'success',
                                label: t('catalog.stat_active', {
                                    count: stats.productos_activos,
                                }),
                            },
                            {
                                key: 'inactive',
                                label: t('catalog.stat_inactive', {
                                    count: inactivos,
                                }),
                            },
                            {
                                key: 'categories',
                                icon: FolderOpen,
                                label: t('catalog.stat_categories', {
                                    count: stats.categorias,
                                }),
                            },
                            {
                                key: 'areas',
                                icon: LayoutGrid,
                                label: t('catalog.stat_areas', {
                                    count: areasCount,
                                }),
                            },
                            {
                                key: 'matches',
                                icon: Tag,
                                label: t('catalog.stat_matches', {
                                    count: stats.coincidencias,
                                }),
                            },
                        ]}
                    />
                </div>
            </div>

            <StatusPills
                aria-label={t('filter_label')}
                options={estadoOptions}
                value={estado}
                onChange={onEstadoChange}
            />
        </div>
    );
}

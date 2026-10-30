import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
                    browseLabel={t('category_browse', {
                        defaultValue: 'Ver todas',
                    })}
                    manageBrowseLabel={t('category_manage', {
                        defaultValue: 'Gestionar',
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

                <SearchField
                    value={search}
                    onValueChange={onSearchChange}
                    placeholder={t('search_placeholder')}
                    isSearching={isSearching}
                    className="w-full sm:max-w-xs lg:shrink-0"
                />
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

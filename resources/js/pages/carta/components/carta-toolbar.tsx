import {
    CheckCircle2,
    FolderOpen,
    LayoutGrid,
    MoreHorizontal,
    Pencil,
    Tag,
    Trash2,
    UtensilsCrossed,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    InlineStats,
    PillFilters,
    SearchField,
    StatusPills,
    type PillFilterItem,
} from '@/components/data-page';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
    CartaEstadoFilter,
    CartaStats,
    CategoriaCarta,
} from '../types';

const ALL_CATEGORIAS = '__all__';

type CartaToolbarProps = {
    categorias: CategoriaCarta[];
    stats: CartaStats;
    categoriaId: string | null;
    estado: CartaEstadoFilter;
    search: string;
    isSearching?: boolean;
    canUpdate: boolean;
    canDelete: boolean;
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
    canUpdate,
    canDelete,
    onCategoriaChange,
    onEstadoChange,
    onSearchChange,
    onEditCategoria,
    onDeleteCategoria,
}: CartaToolbarProps) {
    const { t } = useTranslation(['carta', 'common']);
    const inactivos = Math.max(0, stats.productos - stats.productos_activos);
    const areasCount = stats.areas ?? 0;
    const showCatActions = canUpdate || canDelete;

    const categoriaItems = useMemo<PillFilterItem<string>[]>(() => {
        const all: PillFilterItem<string> = {
            value: ALL_CATEGORIAS,
            label: t('filters.all'),
            count: stats.productos,
        };

        const catPills = categorias.map((cat) => ({
            value: cat.id,
            label: cat.nombre,
            count: cat.productos_count ?? 0,
            muted: !cat.activa,
            trailing: showCatActions ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t('row.actions_for_category', {
                                name: cat.nombre,
                            })}
                            className="size-8 cursor-pointer"
                        >
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        {canUpdate ? (
                            <DropdownMenuItem
                                onSelect={() => onEditCategoria(cat)}
                                className="cursor-pointer gap-2"
                            >
                                <Pencil className="size-4" />
                                {t('common:actions.edit')}
                            </DropdownMenuItem>
                        ) : null}
                        {canDelete ? (
                            <DropdownMenuItem
                                onSelect={() => onDeleteCategoria(cat)}
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                            >
                                <Trash2 className="size-4" />
                                {t('common:actions.delete')}
                            </DropdownMenuItem>
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : undefined,
        }));

        return [all, ...catPills];
    }, [
        categorias,
        stats.productos,
        showCatActions,
        canUpdate,
        canDelete,
        onEditCategoria,
        onDeleteCategoria,
        t,
    ]);

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
                <PillFilters
                    aria-label={t('category_filter_label')}
                    items={categoriaItems}
                    value={categoriaId ?? ALL_CATEGORIAS}
                    clearValue={ALL_CATEGORIAS}
                    toggleOff
                    onChange={(value) =>
                        onCategoriaChange(
                            value === ALL_CATEGORIAS ? null : value,
                        )
                    }
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

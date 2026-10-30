import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ScrollableEntityFilters,
    SearchField,
    StatusPills,
} from '@/components/data-page';
import type { SalonEstadoFilter, SalonStats, ZonaSalon } from '../types';

type SalonToolbarProps = {
    zonas: ZonaSalon[];
    stats: SalonStats;
    zonaId: string | null;
    estado: SalonEstadoFilter;
    query: string;
    canUpdate: boolean;
    canDelete: boolean;
    onZonaChange: (zonaId: string | null) => void;
    onEstadoChange: (estado: SalonEstadoFilter) => void;
    onQueryChange: (query: string) => void;
    onEditZona: (zona: ZonaSalon) => void;
    onDeleteZona: (zona: ZonaSalon) => void;
};

export function SalonToolbar({
    zonas,
    stats,
    zonaId,
    estado,
    query,
    canUpdate,
    canDelete,
    onZonaChange,
    onEstadoChange,
    onQueryChange,
    onEditZona,
    onDeleteZona,
}: SalonToolbarProps) {
    const { t } = useTranslation(['salon', 'common']);
    const canManage = canUpdate || canDelete;

    const entityItems = useMemo(
        () =>
            zonas.map((zona) => ({
                id: zona.id,
                label: zona.nombre,
                count: zona.mesas_count ?? 0,
                muted: !zona.activa,
            })),
        [zonas],
    );

    const estadoOptions = useMemo(
        () =>
            [
                { value: 'todos' as const, label: t('filters.all') },
                { value: 'activas' as const, label: t('filters.active') },
                { value: 'inactivas' as const, label: t('filters.inactive') },
            ] as const,
        [t],
    );

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <ScrollableEntityFilters
                    aria-label={t('zona_filter_label')}
                    items={entityItems}
                    value={zonaId}
                    allLabel={t('filters.all')}
                    allCount={stats.mesas}
                    onChange={onZonaChange}
                    searchPlaceholder={t('zona_search', {
                        defaultValue: 'Buscar zona…',
                    })}
                    browseLabel={t('zona_browse', {
                        defaultValue: 'Ver todas',
                    })}
                    manageBrowseLabel={t('zona_manage', {
                        defaultValue: 'Gestionar',
                    })}
                    canManage={canManage}
                    manageLabel={(name) =>
                        t('row.actions_for_zona', { name })
                    }
                    onEdit={
                        canUpdate
                            ? (id) => {
                                  const zona = zonas.find((z) => z.id === id);
                                  if (zona) {
                                      onEditZona(zona);
                                  }
                              }
                            : undefined
                    }
                    onDelete={
                        canDelete
                            ? (id) => {
                                  const zona = zonas.find((z) => z.id === id);
                                  if (zona) {
                                      onDeleteZona(zona);
                                  }
                              }
                            : undefined
                    }
                    editLabel={t('common:actions.edit')}
                    deleteLabel={t('common:actions.delete')}
                    className="min-w-0 flex-1"
                />

                <SearchField
                    value={query}
                    onValueChange={onQueryChange}
                    placeholder={t('floor.search')}
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

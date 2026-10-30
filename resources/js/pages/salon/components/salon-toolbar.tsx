import { Armchair, CheckCircle2, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    InlineStats,
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
    const inactivas = Math.max(0, stats.mesas - stats.mesas_activas);
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

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <SearchField
                        value={query}
                        onValueChange={onQueryChange}
                        placeholder={t('floor.search')}
                        className="flex-1 sm:max-w-xs"
                    />
                    <InlineStats
                        items={[
                            {
                                key: 'total',
                                icon: Armchair,
                                label: t('floor.stat_total', {
                                    count: stats.mesas,
                                }),
                            },
                            {
                                key: 'available',
                                icon: CheckCircle2,
                                tone: 'success',
                                label: t('floor.stat_available', {
                                    count: stats.mesas_activas,
                                }),
                            },
                            {
                                key: 'inactive',
                                label: t('floor.stat_inactive', {
                                    count: inactivas,
                                }),
                            },
                            {
                                key: 'capacity',
                                icon: Users,
                                label: t('floor.stat_capacity', {
                                    count: stats.capacidad,
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

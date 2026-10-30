import { Armchair, CheckCircle2, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
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
import type { SalonEstadoFilter, SalonStats, ZonaSalon } from '../types';

const ALL_ZONAS = '__all__';

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
    const showZonaActions = canUpdate || canDelete;

    const zonaItems = useMemo<PillFilterItem<string>[]>(() => {
        const all: PillFilterItem<string> = {
            value: ALL_ZONAS,
            label: t('filters.all'),
            count: stats.mesas,
        };

        const zonaPills = zonas.map((zona) => ({
            value: zona.id,
            label: zona.nombre,
            count: zona.mesas_count ?? 0,
            muted: !zona.activa,
            trailing: showZonaActions ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t('row.actions_for_zona', {
                                name: zona.nombre,
                            })}
                            className="size-8 cursor-pointer"
                        >
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        {canUpdate ? (
                            <DropdownMenuItem
                                onSelect={() => onEditZona(zona)}
                                className="cursor-pointer gap-2"
                            >
                                <Pencil className="size-4" />
                                {t('common:actions.edit')}
                            </DropdownMenuItem>
                        ) : null}
                        {canDelete ? (
                            <DropdownMenuItem
                                onSelect={() => onDeleteZona(zona)}
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

        return [all, ...zonaPills];
    }, [
        zonas,
        stats.mesas,
        showZonaActions,
        canUpdate,
        canDelete,
        onEditZona,
        onDeleteZona,
        t,
    ]);

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
                <PillFilters
                    aria-label={t('zona_filter_label')}
                    items={zonaItems}
                    value={zonaId ?? ALL_ZONAS}
                    clearValue={ALL_ZONAS}
                    toggleOff
                    onChange={(value) =>
                        onZonaChange(value === ALL_ZONAS ? null : value)
                    }
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

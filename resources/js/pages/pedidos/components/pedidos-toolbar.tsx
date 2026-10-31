import { History } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DateRangeFilter } from '@/components/date-range-filter';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import type { PedidosFilters } from '../types';

type PedidosToolbarProps = {
    filters: PedidosFilters;
    isLoading?: boolean;
    onEstadoChange: (estado: string) => void;
    onRangeApply: (desde: string, hasta: string) => void;
    onRangeClear: () => void;
};

export function PedidosToolbar({
    filters,
    isLoading,
    onEstadoChange,
    onRangeApply,
    onRangeClear,
}: PedidosToolbarProps) {
    const { t } = useTranslation(['pedidos', 'common']);

    const estadoOptions = useMemo<readonly FilterSelectOption<string>[]>(
        () => [
            { value: 'activos', label: t('filters.activos'), tone: 'warning' },
            {
                value: 'historico',
                label: t('filters.historico'),
                tone: 'info',
            },
            {
                value: 'cerrados',
                label: t('filters.cerrados'),
                tone: 'success',
            },
            {
                value: 'anulados',
                label: t('filters.anulados'),
                tone: 'danger',
            },
            { value: 'todos', label: t('filters.todos') },
        ],
        [t],
    );

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <FilterSelect
                ariaLabel={t('filters.estado')}
                value={filters.estado}
                onChange={onEstadoChange}
                options={estadoOptions}
                disabled={isLoading}
            />

            <DateRangeFilter
                desde={filters.desde}
                hasta={filters.hasta}
                disabled={isLoading}
                onApply={onRangeApply}
                onClear={onRangeClear}
            />

            {filters.estado === 'historico' ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <History className="size-3.5 shrink-0" />
                    {t('filters.historico_hint')}
                </p>
            ) : null}
        </div>
    );
}

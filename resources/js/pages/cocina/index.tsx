import { Head, router } from '@inertiajs/react';
import { Check, ChefHat, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PageHeader } from '@/components/data-page';
import { DateRangeFilter } from '@/components/date-range-filter';
import { Button } from '@/components/ui/button';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { todayIso } from '../pedidos/types';
import {
    CocinaTicketCard,
    type CocinaTicket,
} from './components/cocina-ticket-card';
import cocina from './cocina-routes';

type Props = {
    tickets: CocinaTicket[];
    areas: { id: string; nombre: string }[];
    filters: {
        area_id: string | null;
        vista: string;
        desde: string;
        hasta: string;
        sede_id: string | null;
    };
    stats: { en_cola: number; listos: number };
};

export default function Index({ tickets, areas, filters, stats }: Props) {
    const { t } = useTranslation(['cocina', 'common']);
    const { can } = usePermission();
    const [markingId, setMarkingId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const id = window.setInterval(() => {
            router.reload({
                only: ['tickets', 'stats', 'filters', 'servicioFeed'],
                preserveState: true,
                preserveScroll: true,
            });
        }, 5000);
        return () => window.clearInterval(id);
    }, []);

    const areaOptions = useMemo<readonly FilterSelectOption<string>[]>(
        () => [
            { value: 'todas', label: t('filters.area_all') },
            ...areas.map((a) => ({ value: a.id, label: a.nombre })),
        ],
        [areas, t],
    );

    const vistaOptions = useMemo<readonly FilterSelectOption<string>[]>(
        () => [
            { value: 'cola', label: t('filters.cola'), tone: 'warning' },
            { value: 'listos', label: t('filters.listos'), tone: 'success' },
            { value: 'todos', label: t('filters.todos') },
        ],
        [t],
    );

    function visit(params: {
        area_id?: string | null;
        vista?: string;
        desde?: string;
        hasta?: string;
    }) {
        const day = todayIso();
        router.get(
            cocina.index().url,
            {
                area_id:
                    params.area_id === undefined
                        ? filters.area_id || undefined
                        : params.area_id || undefined,
                vista: params.vista ?? filters.vista,
                desde: params.desde ?? filters.desde ?? day,
                hasta: params.hasta ?? filters.hasta ?? day,
            },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['tickets', 'filters', 'stats'],
            },
        );
    }

    function apply(key: string, value: string) {
        if (key === 'area_id') {
            visit({
                area_id: value === 'todas' ? null : value,
            });
            return;
        }
        visit({ vista: value });
    }

    function marcarListo(lineaId: string) {
        setMarkingId(lineaId);
        router.post(
            cocina.listo(lineaId).url,
            {},
            {
                preserveScroll: true,
                onFinish: () => setMarkingId(null),
            },
        );
    }

    function refresh() {
        setRefreshing(true);
        router.reload({
            only: ['tickets', 'stats', 'filters'],
            onFinish: () => setRefreshing(false),
        });
    }

    const emptyTitle =
        filters.vista === 'listos'
            ? t('empty.listos_title')
            : filters.vista === 'cola'
              ? t('empty.cola_title')
              : t('empty.title');
    const emptyDescription =
        filters.vista === 'listos'
            ? t('empty.listos_description')
            : filters.vista === 'cola'
              ? t('empty.cola_description')
              : t('empty.description');

    const boardSummary = t('board.summary', {
        cola: stats.en_cola,
        listos: stats.listos,
        tickets: tickets.length,
    });

    return (
        <>
            <Head title={t('title')} />
            <div className="flex flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('description')}
                    stats={[
                        {
                            label: t('stats.en_cola'),
                            value: stats.en_cola,
                            variant: 'warning',
                            icon: ChefHat,
                            onClick: () => visit({ vista: 'cola' }),
                            className: cn(
                                'cursor-pointer transition-all duration-150',
                                filters.vista === 'cola' &&
                                    'ring-2 ring-amber-500/50 ring-offset-2 ring-offset-background',
                            ),
                        },
                        {
                            label: t('stats.listos'),
                            value: stats.listos,
                            variant: 'success',
                            icon: Check,
                            onClick: () => visit({ vista: 'listos' }),
                            className: cn(
                                'cursor-pointer transition-all duration-150',
                                filters.vista === 'listos' &&
                                    'ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-background',
                            ),
                        },
                    ]}
                    action={
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-9 cursor-pointer gap-1.5"
                            onClick={refresh}
                            disabled={refreshing}
                        >
                            <RefreshCw
                                className={cn(
                                    'size-4',
                                    refreshing && 'animate-spin',
                                )}
                                aria-hidden
                            />
                            {t('actions.refresh')}
                        </Button>
                    }
                />

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <FilterSelect
                        ariaLabel={t('filters.area')}
                        value={filters.area_id ?? 'todas'}
                        onChange={(v) => apply('area_id', v)}
                        options={areaOptions}
                    />
                    <FilterSelect
                        ariaLabel={t('filters.vista')}
                        value={filters.vista}
                        onChange={(v) => apply('vista', v)}
                        options={vistaOptions}
                    />
                    <DateRangeFilter
                        desde={filters.desde}
                        hasta={filters.hasta}
                        onApply={(desde, hasta) => visit({ desde, hasta })}
                        onClear={() => {
                            const day = todayIso();
                            visit({ desde: day, hasta: day });
                        }}
                    />
                </div>

                <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                    {boardSummary}
                </p>

                {tickets.length === 0 ? (
                    <EmptyState
                        icon={ChefHat}
                        title={emptyTitle}
                        description={emptyDescription}
                    />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                        {tickets.map((ticket, index) => (
                            <CocinaTicketCard
                                key={ticket.pedido_id}
                                ticket={ticket}
                                canMarkReady={can('cocina.update')}
                                markingId={markingId}
                                onMarkReady={marcarListo}
                                style={{
                                    animationDelay: `${Math.min(index, 12) * 40}ms`,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @media (prefers-reduced-motion: no-preference) {
                    .cocina-ticket-enter {
                        animation: cocina-ticket-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
                    }
                }
                @keyframes cocina-ticket-in {
                    from { opacity: 0; transform: translateY(10px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Cocina', href: '/cocina' },
        ]}
    >
        {page}
    </AppLayout>
);

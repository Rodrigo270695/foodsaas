import { Head, router } from '@inertiajs/react';
import { Check, ChefHat, RefreshCw } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PageHeader } from '@/components/data-page';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import cocina from './cocina-routes';

type Linea = {
    id: string;
    nombre: string;
    cantidad: string | number;
    estado: string;
    notas: string | null;
    enviado_at: string | null;
    area?: { id: string; nombre: string } | null;
};

type Ticket = {
    pedido_id: string;
    numero: number;
    canal: string;
    mesa?: { id: string; codigo: string; nombre: string | null } | null;
    enviado_at: string | null;
    lineas: Linea[];
};

type Props = {
    tickets: Ticket[];
    areas: { id: string; nombre: string }[];
    filters: {
        area_id: string | null;
        vista: string;
        sede_id: string | null;
    };
    stats: { en_cola: number; listos: number };
};

export default function Index({ tickets, areas, filters, stats }: Props) {
    const { t } = useTranslation(['cocina', 'common']);
    const { can } = usePermission();

    useEffect(() => {
        const id = window.setInterval(() => {
            router.reload({
                only: ['tickets', 'stats', 'filters'],
            });
        }, 12000);
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

    function apply(key: string, value: string) {
        const area =
            key === 'area_id'
                ? value === 'todas'
                    ? undefined
                    : value
                : filters.area_id || undefined;

        router.get(
            cocina.index().url,
            {
                area_id: area,
                vista: key === 'vista' ? value : filters.vista,
            },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['tickets', 'filters', 'stats'],
            },
        );
    }

    function marcarListo(lineaId: string) {
        router.post(cocina.listo(lineaId).url, {}, { preserveScroll: true });
    }

    return (
        <>
            <Head title={t('title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('description')}
                    stats={[
                        {
                            label: t('stats.en_cola'),
                            value: stats.en_cola,
                            variant: 'warning',
                            icon: ChefHat,
                        },
                        {
                            label: t('stats.listos'),
                            value: stats.listos,
                            variant: 'success',
                            icon: Check,
                        },
                    ]}
                    action={
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() =>
                                router.reload({
                                    only: ['tickets', 'stats', 'filters'],
                                })
                            }
                        >
                            <RefreshCw className="size-4" />
                            {t('actions.refresh')}
                        </Button>
                    }
                />

                <div className="flex flex-wrap gap-3">
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
                </div>

                {tickets.length === 0 ? (
                    <EmptyState
                        icon={ChefHat}
                        title={t('empty.title')}
                        description={t('empty.description')}
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {tickets.map((ticket) => (
                            <article
                                key={ticket.pedido_id}
                                className="flex flex-col rounded-2xl border border-amber-500/30 bg-card/90 shadow-sm"
                            >
                                <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                                    <div>
                                        <p className="font-semibold text-[#660033]">
                                            {t('ticket.pedido', {
                                                numero: ticket.numero,
                                            })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {ticket.mesa
                                                ? t('ticket.mesa', {
                                                      codigo:
                                                          ticket.mesa.nombre?.trim() ||
                                                          ticket.mesa.codigo,
                                                  })
                                                : t('ticket.mostrador')}
                                        </p>
                                    </div>
                                    {ticket.enviado_at ? (
                                        <time className="text-xs tabular-nums text-muted-foreground">
                                            {new Date(
                                                ticket.enviado_at,
                                            ).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </time>
                                    ) : null}
                                </header>
                                <ul className="flex flex-1 flex-col gap-2 p-3">
                                    {ticket.lineas.map((linea) => (
                                        <li
                                            key={linea.id}
                                            className={cn(
                                                'flex items-start justify-between gap-2 rounded-xl border px-3 py-2',
                                                linea.estado === 'listo'
                                                    ? 'border-emerald-500/30 bg-emerald-500/8'
                                                    : 'border-amber-500/25 bg-amber-500/5',
                                            )}
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium">
                                                    <span className="mr-1 font-bold tabular-nums">
                                                        {Number(linea.cantidad)}
                                                    </span>
                                                    {linea.nombre}
                                                </p>
                                                {linea.notas ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        {linea.notas}
                                                    </p>
                                                ) : null}
                                                {linea.area ? (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {linea.area.nombre}
                                                    </p>
                                                ) : null}
                                            </div>
                                            {linea.estado === 'en_cola' &&
                                            can('cocina.update') ? (
                                                <Can permission="cocina.update">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="shrink-0 gap-1"
                                                        onClick={() =>
                                                            marcarListo(
                                                                linea.id,
                                                            )
                                                        }
                                                    >
                                                        <Check className="size-3.5" />
                                                        {t('actions.listo')}
                                                    </Button>
                                                </Can>
                                            ) : (
                                                <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                                    Listo
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                )}
            </div>
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

import { Head, router } from '@inertiajs/react';
import {
    Armchair,
    CheckCircle2,
    LayoutGrid,
    MoreHorizontal,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    Users,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import { EmptyState, PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import { usePlanLimitReached } from '@/hooks/use-plan-limits';
import { usePermission } from '@/hooks/use-permission';
import {
    resolveDefaultSedeIdOrEmpty,
    shouldShowSedeSelector,
} from '@/lib/default-sede';
import { cn } from '@/lib/utils';
import { toastManager } from '@/lib/toast';
import AppLayout from '@/layouts/app-layout';
import { MesaFloorCard } from './components/mesa-floor-card';
import { MesaFormModal } from './components/mesa-form-modal';
import { ZonaFormModal } from './components/zona-form-modal';
import salon from './salon-routes';
import type {
    MesaSalon,
    SalonEstadoFilter,
    SalonFilters,
    SalonStats,
    SedeOpcion,
    ZonaSalon,
} from './types';

type SalonIndexProps = {
    sedes_opciones: SedeOpcion[];
    zonas: ZonaSalon[];
    mesas: MesaSalon[];
    filters: SalonFilters;
    stats: SalonStats;
    plan_mesas_reached?: boolean;
};

type ModalState =
    | { type: 'idle' }
    | { type: 'zona-create' }
    | { type: 'zona-edit'; zona: ZonaSalon }
    | { type: 'mesa-create' }
    | { type: 'mesa-edit'; mesa: MesaSalon };

const DEFAULT_ESTADO: SalonEstadoFilter = 'todos';
const ALL_ZONAS = '__all__';

const SALON_ONLY = [
    'sedes_opciones',
    'zonas',
    'mesas',
    'filters',
    'stats',
    'plan_mesas_reached',
] as const;

export default function Index({
    sedes_opciones,
    zonas,
    mesas,
    filters,
    stats,
    plan_mesas_reached = false,
}: SalonIndexProps) {
    const { t } = useTranslation(['salon', 'common']);
    const { can } = usePermission();
    const canCreate = can('salon.create');
    const canUpdate = can('salon.update');
    const canDelete = can('salon.delete');
    const hookLimit = usePlanLimitReached('max_mesas');
    const mesasLimitReached = plan_mesas_reached || hookLimit;

    const sedeId =
        filters.sede_id ??
        resolveDefaultSedeIdOrEmpty(sedes_opciones) ??
        '';
    const showSedeSelector = shouldShowSedeSelector(sedes_opciones);

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const [isLoading, setIsLoading] = useState(false);
    const [query, setQuery] = useState('');
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const reload = useCallback(
        (overrides: Partial<SalonFilters> = {}) => {
            setIsLoading(true);
            const merged: Record<string, string> = {};
            const next: SalonFilters = { ...filters, ...overrides };

            if (next.sede_id) {
                merged.sede_id = next.sede_id;
            }
            if (next.zona_id) {
                merged.zona_id = next.zona_id;
            }
            if (next.estado && next.estado !== DEFAULT_ESTADO) {
                merged.estado = next.estado;
            }

            router.get(salon.index().url, merged, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: [...SALON_ONLY],
                onError: () =>
                    toastManager.error({ title: t('toast.load_error') }),
                onFinish: () => setIsLoading(false),
            });
        },
        [filters, t],
    );

    const onSedeChange = (value: string) => {
        reload({ sede_id: value, zona_id: null });
    };

    const onZonaFilterChange = (value: string) => {
        reload({
            zona_id: value === ALL_ZONAS ? null : value,
        });
    };

    const deleteZona = (zona: ZonaSalon) => {
        if (!window.confirm(t('delete.zona_confirm', { name: zona.nombre }))) {
            return;
        }

        router.delete(salon.zonas.destroy(zona.id).url, {
            preserveScroll: true,
        });
    };

    const deleteMesa = (mesa: MesaSalon) => {
        if (!window.confirm(t('delete.mesa_confirm', { code: mesa.codigo }))) {
            return;
        }

        router.delete(salon.mesas.destroy(mesa.id).url, {
            preserveScroll: true,
        });
    };

    const visibleMesas = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q === '') {
            return mesas;
        }

        return mesas.filter((mesa) => {
            const nombre = (mesa.nombre ?? '').toLowerCase();
            const codigo = mesa.codigo.toLowerCase();
            const zona = (mesa.zona?.nombre ?? '').toLowerCase();

            return (
                codigo.includes(q) || nombre.includes(q) || zona.includes(q)
            );
        });
    }, [mesas, query]);

    const inactivas = Math.max(0, stats.mesas - stats.mesas_activas);
    const defaultZonaId = filters.zona_id ?? zonas[0]?.id ?? null;
    const zonaChipValue = filters.zona_id ?? ALL_ZONAS;

    return (
        <>
            <Head title={t('title')} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('floor.subtitle')}
                    action={
                        sedeId ? (
                            <div className="flex flex-row flex-wrap items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => reload()}
                                    disabled={isLoading}
                                    aria-label={t('floor.refresh')}
                                    className="cursor-pointer"
                                >
                                    <RefreshCw
                                        className={cn(
                                            'size-4',
                                            isLoading && 'animate-spin',
                                        )}
                                        strokeWidth={2.5}
                                    />
                                </Button>
                                <Can permission="salon.create">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setModal({ type: 'zona-create' })
                                        }
                                        className="cursor-pointer gap-2"
                                    >
                                        <LayoutGrid
                                            className="size-4"
                                            strokeWidth={2.5}
                                        />
                                        <span className="hidden sm:inline">
                                            {t('actions.new_zona')}
                                        </span>
                                    </Button>
                                </Can>
                                <Can permission="salon.create">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex">
                                                <Button
                                                    type="button"
                                                    onClick={() =>
                                                        setModal({
                                                            type: 'mesa-create',
                                                        })
                                                    }
                                                    disabled={
                                                        mesasLimitReached ||
                                                        zonas.length === 0
                                                    }
                                                    className="cursor-pointer gap-2"
                                                >
                                                    <Plus
                                                        className="size-4"
                                                        strokeWidth={2.5}
                                                    />
                                                    <span className="hidden sm:inline">
                                                        {t('actions.new_mesa')}
                                                    </span>
                                                    <span className="sm:hidden">
                                                        {t(
                                                            'actions.new_mesa_short',
                                                        )}
                                                    </span>
                                                </Button>
                                            </span>
                                        </TooltipTrigger>
                                        {mesasLimitReached ? (
                                            <TooltipContent
                                                side="bottom"
                                                className="max-w-xs"
                                            >
                                                {t('plan_limit.max_mesas')}
                                            </TooltipContent>
                                        ) : zonas.length === 0 ? (
                                            <TooltipContent
                                                side="bottom"
                                                className="max-w-xs"
                                            >
                                                {t('mesa_form.no_zonas')}
                                            </TooltipContent>
                                        ) : null}
                                    </Tooltip>
                                </Can>
                            </div>
                        ) : undefined
                    }
                />

                {showSedeSelector ? (
                    <div className="flex flex-col gap-1.5 sm:max-w-xs">
                        <label
                            htmlFor="salon-sede"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            {t('sede_label')}
                        </label>
                        <Select
                            value={sedeId || undefined}
                            onValueChange={onSedeChange}
                        >
                            <SelectTrigger id="salon-sede" className="h-10 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {sedes_opciones.map((sede) => (
                                    <SelectItem key={sede.id} value={sede.id}>
                                        {sede.nombre} ({sede.codigo})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}

                {!sedeId ? (
                    <EmptyState
                        icon={LayoutGrid}
                        title={t('empty.no_sede_title')}
                        description={t('empty.no_sede_description')}
                    />
                ) : (
                    <>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => onZonaFilterChange(ALL_ZONAS)}
                                    className={cn(
                                        'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                                        zonaChipValue === ALL_ZONAS
                                            ? 'border-brand-600 bg-brand-600 text-white'
                                            : 'border-border/70 bg-background text-foreground hover:bg-muted/50',
                                    )}
                                >
                                    {t('filters.all')}
                                    <span className="tabular-nums opacity-80">
                                        {stats.mesas}
                                    </span>
                                </button>
                                {zonas.map((zona) => (
                                    <div
                                        key={zona.id}
                                        className="inline-flex items-center gap-0.5"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onZonaFilterChange(
                                                    filters.zona_id === zona.id
                                                        ? ALL_ZONAS
                                                        : zona.id,
                                                )
                                            }
                                            className={cn(
                                                'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                                                filters.zona_id === zona.id
                                                    ? 'border-brand-600 bg-brand-600 text-white'
                                                    : 'border-border/70 bg-background text-foreground hover:bg-muted/50',
                                                !zona.activa && 'opacity-60',
                                            )}
                                        >
                                            {zona.nombre}
                                            <span className="tabular-nums opacity-80">
                                                {zona.mesas_count ?? 0}
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
                                                            'row.actions_for_zona',
                                                            {
                                                                name: zona.nombre,
                                                            },
                                                        )}
                                                        className="size-8 cursor-pointer"
                                                    >
                                                        <MoreHorizontal className="size-4" />
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
                                                                    type: 'zona-edit',
                                                                    zona,
                                                                })
                                                            }
                                                            className="cursor-pointer gap-2"
                                                        >
                                                            <Pencil className="size-4" />
                                                            {t(
                                                                'common:actions.edit',
                                                            )}
                                                        </DropdownMenuItem>
                                                    ) : null}
                                                    {canDelete ? (
                                                        <DropdownMenuItem
                                                            onSelect={() =>
                                                                deleteZona(zona)
                                                            }
                                                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="size-4" />
                                                            {t(
                                                                'common:actions.delete',
                                                            )}
                                                        </DropdownMenuItem>
                                                    ) : null}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
                                    <Search
                                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                        aria-hidden
                                    />
                                    <Input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={t('floor.search')}
                                        className="h-9 pl-9"
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        <Armchair className="size-3.5" />
                                        {t('floor.stat_total', {
                                            count: stats.mesas,
                                        })}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                                        <CheckCircle2 className="size-3.5" />
                                        {t('floor.stat_available', {
                                            count: stats.mesas_activas,
                                        })}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        {t('floor.stat_inactive', {
                                            count: inactivas,
                                        })}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Users className="size-3.5" />
                                        {t('floor.stat_capacity', {
                                            count: stats.capacidad,
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {(
                                [
                                    ['todos', t('filters.all')],
                                    ['activas', t('filters.active')],
                                    ['inactivas', t('filters.inactive')],
                                ] as const
                            ).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                        reload({
                                            estado: value as SalonEstadoFilter,
                                        })
                                    }
                                    className={cn(
                                        'h-8 cursor-pointer rounded-lg border px-2.5 text-xs font-medium transition-colors',
                                        filters.estado === value
                                            ? 'border-brand-600/40 bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200'
                                            : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted',
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {zonas.length === 0 ? (
                            <EmptyState
                                icon={LayoutGrid}
                                title={t('empty.no_zonas_title')}
                                description={t('empty.no_zonas_description')}
                                action={
                                    canCreate ? (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                setModal({ type: 'zona-create' })
                                            }
                                            className="cursor-pointer gap-2"
                                        >
                                            <Plus className="size-4" />
                                            {t('actions.create_first_zona')}
                                        </Button>
                                    ) : undefined
                                }
                            />
                        ) : visibleMesas.length === 0 ? (
                            <EmptyState
                                icon={Armchair}
                                title={
                                    query.trim() ||
                                    filters.zona_id ||
                                    filters.estado !== DEFAULT_ESTADO
                                        ? t('empty.no_results_title')
                                        : t('empty.no_mesas_title')
                                }
                                description={
                                    query.trim() ||
                                    filters.zona_id ||
                                    filters.estado !== DEFAULT_ESTADO
                                        ? t('empty.no_results_description')
                                        : t('empty.no_mesas_description')
                                }
                                action={
                                    !query.trim() &&
                                    !filters.zona_id &&
                                    filters.estado === DEFAULT_ESTADO &&
                                    canCreate ? (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                setModal({ type: 'mesa-create' })
                                            }
                                            disabled={mesasLimitReached}
                                            className="cursor-pointer gap-2"
                                        >
                                            <Plus className="size-4" />
                                            {t('actions.create_first_mesa')}
                                        </Button>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <div
                                className={cn(
                                    'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
                                    isLoading && 'pointer-events-none opacity-60',
                                )}
                                role="status"
                                aria-live="polite"
                                aria-label={t('aria.results_count_other', {
                                    count: visibleMesas.length,
                                })}
                            >
                                {visibleMesas.map((mesa, index) => (
                                    <div
                                        key={mesa.id}
                                        className="animate-in fade-in zoom-in-95 fill-mode-both duration-300"
                                        style={{
                                            animationDelay: `${Math.min(index, 12) * 40}ms`,
                                        }}
                                    >
                                        <MesaFloorCard
                                            mesa={mesa}
                                            canUpdate={canUpdate}
                                            canDelete={canDelete}
                                            onEdit={(m) =>
                                                setModal({
                                                    type: 'mesa-edit',
                                                    mesa: m,
                                                })
                                            }
                                            onDelete={deleteMesa}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <ZonaFormModal
                open={modal.type === 'zona-create' || modal.type === 'zona-edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                zona={modal.type === 'zona-edit' ? modal.zona : null}
                sedes={sedes_opciones}
                defaultSedeId={sedeId}
            />

            <MesaFormModal
                open={modal.type === 'mesa-create' || modal.type === 'mesa-edit'}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                mesa={modal.type === 'mesa-edit' ? modal.mesa : null}
                sedes={sedes_opciones}
                zonas={zonas}
                defaultSedeId={sedeId}
                defaultZonaId={defaultZonaId}
            />
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Salón', href: '/salon' },
        ]}
    >
        {page}
    </AppLayout>
);

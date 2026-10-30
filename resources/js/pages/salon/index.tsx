import { Head, router } from '@inertiajs/react';
import {
    Armchair,
    CheckCircle2,
    LayoutGrid,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
    Users,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import {
    DataTable,
    EmptyState,
    FilterChips,
    PageHeader,
    StatBadge,
} from '@/components/data-page';
import type { DataTableColumn, FilterChip } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toastManager } from '@/lib/toast';
import AppLayout from '@/layouts/app-layout';
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
    const showRowActions = canUpdate || canDelete;
    const hookLimit = usePlanLimitReached('max_mesas');
    const mesasLimitReached = plan_mesas_reached || hookLimit;

    const sedeId =
        filters.sede_id ??
        resolveDefaultSedeIdOrEmpty(sedes_opciones) ??
        '';
    const showSedeSelector = shouldShowSedeSelector(sedes_opciones);

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const [isLoading, setIsLoading] = useState(false);
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

    const estadoOptions: readonly FilterChip<SalonEstadoFilter>[] = useMemo(
        () => [
            { value: 'todos', label: t('filters.all') },
            { value: 'activas', label: t('filters.active') },
            { value: 'inactivas', label: t('filters.inactive') },
        ],
        [t],
    );

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

    const zonaSelectValue =
        filters.zona_id && filters.zona_id !== '' ? filters.zona_id : ALL_ZONAS;

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.zona_id) {
            count += 1;
        }
        if (filters.estado !== DEFAULT_ESTADO) {
            count += 1;
        }

        return count;
    }, [filters.zona_id, filters.estado]);

    const columns = useMemo<DataTableColumn<MesaSalon>[]>(() => {
        const base: DataTableColumn<MesaSalon>[] = [
            {
                key: 'codigo',
                header: t('columns.codigo'),
                cell: (mesa) => (
                    <span className="font-mono text-xs font-semibold tracking-wide">
                        {mesa.codigo}
                    </span>
                ),
            },
            {
                key: 'nombre',
                header: t('columns.nombre'),
                cell: (mesa) => (
                    <span className="text-sm">
                        {mesa.nombre?.trim() || (
                            <span className="text-muted-foreground">
                                {t('row.no_name')}
                            </span>
                        )}
                    </span>
                ),
                className: 'hidden sm:table-cell',
            },
            {
                key: 'zona',
                header: t('columns.zona'),
                cell: (mesa) => (
                    <span className="text-sm text-foreground/90">
                        {mesa.zona?.nombre ?? '—'}
                    </span>
                ),
            },
            {
                key: 'capacidad',
                header: t('columns.capacidad'),
                align: 'center',
                cell: (mesa) => (
                    <span className="tabular-nums text-sm">{mesa.capacidad}</span>
                ),
            },
            {
                key: 'estado',
                header: t('columns.estado'),
                cell: (mesa) =>
                    mesa.activa ? (
                        <StatBadge
                            label={t('row.active')}
                            value=""
                            variant="success"
                        />
                    ) : (
                        <StatBadge
                            label={t('row.inactive')}
                            value=""
                            variant="muted"
                        />
                    ),
            },
        ];

        if (showRowActions) {
            base.push({
                key: 'acciones',
                header: (
                    <span className="md:sr-only">{t('columns.acciones')}</span>
                ),
                align: 'right',
                cell: (mesa) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t('row.actions_for_mesa', {
                                    code: mesa.codigo,
                                })}
                                className="size-8 cursor-pointer"
                            >
                                <MoreHorizontal className="size-4" strokeWidth={2.5} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {canUpdate ? (
                                <DropdownMenuItem
                                    onSelect={() =>
                                        setModal({ type: 'mesa-edit', mesa })
                                    }
                                    className="cursor-pointer gap-2"
                                >
                                    <Pencil className="size-4" strokeWidth={2.25} />
                                    {t('common:actions.edit')}
                                </DropdownMenuItem>
                            ) : null}
                            {canDelete ? (
                                <DropdownMenuItem
                                    onSelect={() => deleteMesa(mesa)}
                                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="size-4" strokeWidth={2.25} />
                                    {t('common:actions.delete')}
                                </DropdownMenuItem>
                            ) : null}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
                className: 'w-12',
            });
        }

        return base;
    }, [t, showRowActions, canUpdate, canDelete]);

    const defaultZonaId = filters.zona_id ?? zonas[0]?.id ?? null;

    return (
        <>
            <Head title={t('title')} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('description')}
                    stats={[
                        {
                            label: t('stats.zonas'),
                            value: stats.zonas,
                            variant: 'info',
                            icon: LayoutGrid,
                        },
                        {
                            label: t('stats.mesas'),
                            value: stats.mesas,
                            variant: 'primary',
                            icon: Armchair,
                        },
                        {
                            label: t('stats.activas'),
                            value: stats.mesas_activas,
                            variant: 'success',
                            icon: CheckCircle2,
                        },
                        {
                            label: t('stats.capacidad'),
                            value: stats.capacidad,
                            variant: 'warning',
                            icon: Users,
                        },
                    ]}
                    action={
                        sedeId ? (
                            <div className="flex flex-row flex-wrap items-center justify-end gap-2">
                                <Can permission="salon.create">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setModal({ type: 'zona-create' })
                                        }
                                        className="cursor-pointer gap-2"
                                    >
                                        <Plus className="size-4" strokeWidth={2.5} />
                                        <span className="hidden sm:inline">
                                            {t('actions.new_zona')}
                                        </span>
                                        <span className="sm:hidden">
                                            {t('actions.new_zona_short')}
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
                                                        {t('actions.new_mesa_short')}
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
                        <Select value={sedeId || undefined} onValueChange={onSedeChange}>
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
                        <section className="rounded-xl border border-border/60 bg-card/30 p-4">
                            <div className="mb-3">
                                <h2 className="text-sm font-semibold text-foreground">
                                    {t('sections.zonas')}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {t('sections.zonas_hint')}
                                </p>
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
                                                <Plus
                                                    className="size-4"
                                                    strokeWidth={2.5}
                                                />
                                                {t('actions.create_first_zona')}
                                            </Button>
                                        ) : undefined
                                    }
                                />
                            ) : (
                                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {zonas.map((zona) => (
                                        <li
                                            key={zona.id}
                                            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                                                filters.zona_id === zona.id
                                                    ? 'border-primary/50 bg-primary/5'
                                                    : 'border-border/60 bg-background/40 hover:bg-muted/30'
                                            }`}
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
                                                className="min-w-0 flex-1 cursor-pointer text-left"
                                            >
                                                <span className="block truncate text-sm font-medium">
                                                    {zona.nombre}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {(zona.mesas_count ?? 0) === 1
                                                        ? t('row.mesas_count_one')
                                                        : t('row.mesas_count', {
                                                              count:
                                                                  zona.mesas_count ??
                                                                  0,
                                                          })}
                                                    {!zona.activa
                                                        ? ` · ${t('row.inactive')}`
                                                        : ''}
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
                                                                { name: zona.nombre },
                                                            )}
                                                            className="size-8 shrink-0 cursor-pointer"
                                                        >
                                                            <MoreHorizontal
                                                                className="size-4"
                                                                strokeWidth={2.5}
                                                            />
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
                                                                <Pencil
                                                                    className="size-4"
                                                                    strokeWidth={2.25}
                                                                />
                                                                {t('common:actions.edit')}
                                                            </DropdownMenuItem>
                                                        ) : null}
                                                        {canDelete ? (
                                                            <DropdownMenuItem
                                                                onSelect={() =>
                                                                    deleteZona(zona)
                                                                }
                                                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2
                                                                    className="size-4"
                                                                    strokeWidth={2.25}
                                                                />
                                                                {t('common:actions.delete')}
                                                            </DropdownMenuItem>
                                                        ) : null}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <DataTable
                            columns={columns}
                            data={mesas}
                            rowKey={(m) => m.id}
                            isLoading={isLoading}
                            ariaLiveMessage={t('aria.results_count_other', {
                                count: mesas.length,
                            })}
                            toolbar={
                                <div className="flex w-full flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <h2 className="text-sm font-semibold text-foreground">
                                        {t('sections.mesas')}
                                    </h2>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        {zonas.length > 0 ? (
                                            <Select
                                                value={zonaSelectValue}
                                                onValueChange={onZonaFilterChange}
                                            >
                                                <SelectTrigger
                                                    aria-label={t('zona_filter_label')}
                                                    className="h-9 w-full sm:w-[180px]"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={ALL_ZONAS}>
                                                        {t('zona_all')}
                                                    </SelectItem>
                                                    {zonas.map((z) => (
                                                        <SelectItem
                                                            key={z.id}
                                                            value={z.id}
                                                        >
                                                            {z.nombre}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : null}
                                        <FilterChips
                                            ariaLabel={t('filter_label')}
                                            value={filters.estado}
                                            onChange={(estado) => reload({ estado })}
                                            options={estadoOptions}
                                        />
                                    </div>
                                </div>
                            }
                            emptyState={
                                <EmptyState
                                    icon={Armchair}
                                    title={
                                        activeFiltersCount > 0
                                            ? t('empty.no_results_title')
                                            : t('empty.no_mesas_title')
                                    }
                                    description={
                                        activeFiltersCount > 0
                                            ? t('empty.no_results_description')
                                            : t('empty.no_mesas_description')
                                    }
                                    action={
                                        activeFiltersCount === 0 &&
                                        canCreate &&
                                        zonas.length > 0 ? (
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    setModal({ type: 'mesa-create' })
                                                }
                                                disabled={mesasLimitReached}
                                                className="cursor-pointer gap-2"
                                            >
                                                <Plus
                                                    className="size-4"
                                                    strokeWidth={2.5}
                                                />
                                                {t('actions.create_first_mesa')}
                                            </Button>
                                        ) : undefined
                                    }
                                />
                            }
                        />
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

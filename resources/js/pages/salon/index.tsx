import { Head, router } from '@inertiajs/react';
import {
    Armchair,
    CheckCircle2,
    LayoutGrid,
    Plus,
    Users,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CopyToSedeModal } from '@/components/copy-to-sede-modal';
import { EmptyState, PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { usePlanLimitReached } from '@/hooks/use-plan-limits';
import { usePermission } from '@/hooks/use-permission';
import { toastManager } from '@/lib/toast';
import AppLayout from '@/layouts/app-layout';
import { MesaFormModal } from './components/mesa-form-modal';
import { MesasGrid } from './components/mesas-grid';
import { SalonHeaderActions } from './components/salon-header-actions';
import { SalonToolbar } from './components/salon-toolbar';
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
    copy_targets?: SedeOpcion[];
};

type ModalState =
    | { type: 'idle' }
    | { type: 'zona-create' }
    | { type: 'zona-edit'; zona: ZonaSalon }
    | { type: 'mesa-create' }
    | { type: 'mesa-edit'; mesa: MesaSalon };

const DEFAULT_ESTADO: SalonEstadoFilter = 'todos';

const SALON_ONLY = [
    'sedes_opciones',
    'zonas',
    'mesas',
    'filters',
    'stats',
    'plan_mesas_reached',
    'copy_targets',
] as const;

export default function Index({
    sedes_opciones,
    zonas,
    mesas,
    filters,
    stats,
    plan_mesas_reached = false,
    copy_targets = [],
}: SalonIndexProps) {
    const { t } = useTranslation(['salon', 'common']);
    const { can } = usePermission();
    const canCreate = can('salon.create');
    const canUpdate = can('salon.update');
    const canDelete = can('salon.delete');
    const hookLimit = usePlanLimitReached('max_mesas');
    const mesasLimitReached = plan_mesas_reached || hookLimit;

    const sedeId = filters.sede_id ?? '';

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const [copyOpen, setCopyOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [query, setQuery] = useState('');
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);

    const reload = useCallback(
        (overrides: Partial<SalonFilters> = {}) => {
            setIsLoading(true);
            const merged: Record<string, string> = {};
            const next: SalonFilters = { ...filters, ...overrides };

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

    const deleteZona = useCallback(
        (zona: ZonaSalon) => {
            if (
                !window.confirm(
                    t('delete.zona_confirm', { name: zona.nombre }),
                )
            ) {
                return;
            }
            router.delete(salon.zonas.destroy(zona.id).url, {
                preserveScroll: true,
            });
        },
        [t],
    );

    const deleteMesa = useCallback(
        (mesa: MesaSalon) => {
            if (
                !window.confirm(
                    t('delete.mesa_confirm', { code: mesa.codigo }),
                )
            ) {
                return;
            }
            router.delete(salon.mesas.destroy(mesa.id).url, {
                preserveScroll: true,
            });
        },
        [t],
    );

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

    const hasActiveFilters =
        query.trim() !== '' ||
        Boolean(filters.zona_id) ||
        filters.estado !== DEFAULT_ESTADO;

    const defaultZonaId = filters.zona_id ?? zonas[0]?.id ?? null;
    // Modales usan la sede activa del header (sin selector local).
    const sedeForForms = useMemo(
        () =>
            sedeId
                ? sedes_opciones.filter((s) => s.id === sedeId)
                : sedes_opciones.slice(0, 1),
        [sedeId, sedes_opciones],
    );

    return (
        <>
            <Head title={t('title')} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('floor.subtitle')}
                    stats={[
                        {
                            label: t('stats_badges.total', {
                                defaultValue: 'Total',
                            }),
                            value: stats.mesas,
                            variant: 'info',
                            icon: Armchair,
                        },
                        {
                            label: t('stats_badges.available', {
                                defaultValue: 'Disponibles',
                            }),
                            value: stats.mesas_activas,
                            variant: 'success',
                            icon: CheckCircle2,
                        },
                        {
                            label: t('stats_badges.inactive', {
                                defaultValue: 'Inactivas',
                            }),
                            value: Math.max(
                                0,
                                stats.mesas - stats.mesas_activas,
                            ),
                            variant: 'muted',
                        },
                        {
                            label: t('stats_badges.zones', {
                                defaultValue: 'Zonas',
                            }),
                            value: stats.zonas,
                            variant: 'warning',
                            icon: LayoutGrid,
                        },
                        {
                            label: t('stats_badges.capacity', {
                                defaultValue: 'Capacidad',
                            }),
                            value: stats.capacidad,
                            variant: 'primary',
                            icon: Users,
                        },
                    ]}
                    action={
                        sedeId ? (
                            <SalonHeaderActions
                                isLoading={isLoading}
                                mesasLimitReached={mesasLimitReached}
                                hasZonas={zonas.length > 0}
                                canCopy={canCreate && copy_targets.length > 0}
                                onRefresh={() => reload()}
                                onCopy={() => setCopyOpen(true)}
                                onNewZona={() =>
                                    setModal({ type: 'zona-create' })
                                }
                                onNewMesa={() =>
                                    setModal({ type: 'mesa-create' })
                                }
                            />
                        ) : undefined
                    }
                />

                {!sedeId ? (
                    <EmptyState
                        icon={LayoutGrid}
                        title={t('empty.no_sede_title')}
                        description={t('empty.no_sede_description')}
                    />
                ) : (
                    <>
                        <SalonToolbar
                            zonas={zonas}
                            stats={stats}
                            zonaId={filters.zona_id}
                            estado={filters.estado}
                            query={query}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                            onZonaChange={(zona_id) => reload({ zona_id })}
                            onEstadoChange={(estado) => reload({ estado })}
                            onQueryChange={setQuery}
                            onEditZona={(zona) =>
                                setModal({ type: 'zona-edit', zona })
                            }
                            onDeleteZona={deleteZona}
                        />

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
                                                setModal({
                                                    type: 'zona-create',
                                                })
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
                                    hasActiveFilters
                                        ? t('empty.no_results_title')
                                        : t('empty.no_mesas_title')
                                }
                                description={
                                    hasActiveFilters
                                        ? t('empty.no_results_description')
                                        : t('empty.no_mesas_description')
                                }
                                action={
                                    !hasActiveFilters && canCreate ? (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                setModal({
                                                    type: 'mesa-create',
                                                })
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
                            <MesasGrid
                                mesas={visibleMesas}
                                isLoading={isLoading}
                                canUpdate={canUpdate}
                                canDelete={canDelete}
                                ariaLabel={t('aria.results_count_other', {
                                    count: visibleMesas.length,
                                })}
                                onEdit={(mesa) =>
                                    setModal({ type: 'mesa-edit', mesa })
                                }
                                onDelete={deleteMesa}
                            />
                        )}
                    </>
                )}
            </div>

            <ZonaFormModal
                open={
                    modal.type === 'zona-create' || modal.type === 'zona-edit'
                }
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                zona={modal.type === 'zona-edit' ? modal.zona : null}
                sedes={sedeForForms}
                defaultSedeId={sedeId}
            />

            <MesaFormModal
                open={
                    modal.type === 'mesa-create' || modal.type === 'mesa-edit'
                }
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                mesa={modal.type === 'mesa-edit' ? modal.mesa : null}
                sedes={sedeForForms}
                zonas={zonas}
                defaultSedeId={sedeId}
                defaultZonaId={defaultZonaId}
            />

            <CopyToSedeModal
                open={copyOpen}
                onOpenChange={setCopyOpen}
                targets={copy_targets}
                actionUrl={salon.copyToSede().url}
                title={t('copy.title', {
                    defaultValue: 'Copiar salón a otra sede',
                })}
                description={t('copy.description', {
                    defaultValue:
                        'Copia zonas y mesas a la sede destino. No duplica códigos que ya existan.',
                })}
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

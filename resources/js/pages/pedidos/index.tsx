import { Head } from '@inertiajs/react';
import {
    CheckCircle2,
    ClipboardList,
    CookingPot,
    Plus,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/data-page';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { PedidoFormModal } from './components/pedido-form-modal';
import { PedidosTable } from './components/pedidos-table';
import { PedidosToolbar } from './components/pedidos-toolbar';
import pedidos from './pedidos-routes';
import {
    isHistoricoEstado,
    todayIso,
    type PedidosIndexProps,
} from './types';

export default function Index({
    pedidos: paginated,
    mesas_libres,
    filters,
    stats,
    can_view_all = false,
}: PedidosIndexProps) {
    const { t } = useTranslation(['pedidos', 'common']);
    const { can } = usePermission();
    const [openNew, setOpenNew] = useState(false);
    const historico = isHistoricoEstado(filters.estado);
    const scopeHint = can_view_all
        ? t('scope.all')
        : t('scope.own_only');

    const { isLoading, setPerPage, applyFilter } = useDataTablePage<{
        estado: string;
        desde: string | null;
        hasta: string | null;
    }>({
        routeUrl: pedidos.index().url,
        initialFilters: {
            ...filters,
            sort: null,
            direction: null,
        },
        only: ['pedidos', 'filters', 'stats', 'mesas_libres'],
        errorMessage: t('toast.load_error'),
        storageKey: 'foodsaas.pedidos.prefs',
        defaults: { per_page: 20 },
    });

    function changeEstado(estado: string) {
        const day = todayIso();
        applyFilter({
            estado,
            desde: filters.desde ?? day,
            hasta: filters.hasta ?? day,
        });
    }

    function goHistoricoHoy() {
        const day = todayIso();
        applyFilter({ estado: 'historico', desde: day, hasta: day });
    }

    function goActivos() {
        const day = todayIso();
        applyFilter({
            estado: 'activos',
            desde: filters.desde ?? day,
            hasta: filters.hasta ?? day,
        });
    }

    return (
        <>
            <Head title={t('title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={`${t('description')} ${scopeHint}`}
                    stats={[
                        {
                            label: t('stats.activos'),
                            value: stats.activos,
                            variant: 'warning',
                            icon: ClipboardList,
                            onClick: goActivos,
                        },
                        {
                            label: t('stats.en_cola'),
                            value: stats.en_cola,
                            variant: 'info',
                            icon: CookingPot,
                            onClick: goActivos,
                        },
                        {
                            label: t('stats.cerrados_hoy'),
                            value: stats.cerrados_hoy,
                            variant: 'success',
                            icon: CheckCircle2,
                            onClick: goHistoricoHoy,
                        },
                    ]}
                    action={
                        <Can permission="pedidos.create">
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setOpenNew(true)}
                            >
                                <Plus className="size-4" />
                                <span className="hidden sm:inline">
                                    {t('actions.new')}
                                </span>
                                <span className="sm:hidden">
                                    {t('actions.new_short')}
                                </span>
                            </Button>
                        </Can>
                    }
                />

                <PedidosToolbar
                    filters={filters}
                    isLoading={isLoading}
                    onEstadoChange={changeEstado}
                    onRangeApply={(desde, hasta) => {
                        applyFilter({ desde, hasta });
                    }}
                    onRangeClear={() => {
                        const day = todayIso();
                        applyFilter({ desde: day, hasta: day });
                    }}
                />

                <PedidosTable
                    pedidos={paginated}
                    filters={filters}
                    isLoading={isLoading}
                    isHistorico={historico}
                    canCreate={can('pedidos.create')}
                    onPerPageChange={setPerPage}
                    onCreate={() => setOpenNew(true)}
                />
            </div>

            <PedidoFormModal
                open={openNew}
                onOpenChange={setOpenNew}
                mesasLibres={mesas_libres}
            />
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Servicio' },
            { title: 'Pedidos', href: '/pedidos' },
        ]}
    >
        {page}
    </AppLayout>
);

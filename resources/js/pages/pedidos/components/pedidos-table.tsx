import { router } from '@inertiajs/react';
import { ClipboardList, History, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DataPagination,
    DataTable,
    EmptyState,
    type DataTableColumn,
} from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import pedidos from '../pedidos-routes';
import {
    estadoTone,
    formatFechaHora,
    money,
    type PedidoRow,
    type PedidosFilters,
} from '../types';

type PedidosTableProps = {
    pedidos: Paginated<PedidoRow>;
    filters: PedidosFilters;
    isLoading?: boolean;
    isHistorico: boolean;
    canCreate?: boolean;
    onPerPageChange: (perPage: number) => void;
    onCreate?: () => void;
};

export function PedidosTable({
    pedidos: paginated,
    filters,
    isLoading,
    isHistorico,
    canCreate,
    onPerPageChange,
    onCreate,
}: PedidosTableProps) {
    const { t } = useTranslation(['pedidos', 'common']);

    const columns = useMemo<DataTableColumn<PedidoRow>[]>(
        () => [
            {
                key: 'numero',
                header: t('columns.numero'),
                cell: (row) => (
                    <span className="font-semibold text-brand-600">
                        #{row.numero}
                    </span>
                ),
            },
            {
                key: 'mesa',
                header: t('columns.mesa'),
                cell: (row) =>
                    row.mesa
                        ? row.mesa.nombre?.trim() || row.mesa.codigo
                        : t(`canal.${row.canal}`),
            },
            {
                key: 'mesero',
                header: t('columns.mesero'),
                cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                        {row.openedBy?.name?.trim() ||
                            row.opened_by?.name?.trim() ||
                            '—'}
                    </span>
                ),
            },
            {
                key: 'estado',
                header: t('columns.estado'),
                cell: (row) => (
                    <span
                        className={cn(
                            'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                            estadoTone(row.estado),
                        )}
                    >
                        {t(`estado.${row.estado}`)}
                    </span>
                ),
            },
            {
                key: 'total',
                header: t('columns.total'),
                cell: (row) => (
                    <span className="font-medium tabular-nums">
                        {money(row.total)}
                    </span>
                ),
            },
            {
                key: 'fecha',
                header: t('columns.fecha'),
                cell: (row) => {
                    const { fecha, hora } = formatFechaHora(row.created_at);
                    return (
                        <div className="leading-tight">
                            <p className="text-sm tabular-nums">{fecha}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                                {hora}
                            </p>
                        </div>
                    );
                },
            },
        ],
        [t],
    );

    return (
        <DataTable
            columns={columns}
            data={paginated.data}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            onRowClick={(row) => router.visit(pedidos.show(row.id).url)}
            footer={
                <DataPagination
                    meta={paginated}
                    onPerPageChange={onPerPageChange}
                    preservedQuery={{
                        estado: filters.estado,
                        desde: filters.desde || undefined,
                        hasta: filters.hasta || undefined,
                    }}
                />
            }
            emptyState={
                <EmptyState
                    icon={isHistorico ? History : ClipboardList}
                    title={
                        isHistorico
                            ? t('empty.historico_title')
                            : t('empty.title')
                    }
                    description={
                        isHistorico
                            ? t('empty.historico_description')
                            : t('empty.description')
                    }
                    action={
                        !isHistorico && canCreate && onCreate ? (
                            <Button type="button" onClick={onCreate}>
                                <Plus className="size-4" />
                                {t('actions.new')}
                            </Button>
                        ) : undefined
                    }
                />
            }
        />
    );
}

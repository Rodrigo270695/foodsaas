import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Download, Package, ScrollText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DataPagination,
    DataTable,
    EmptyState,
    PageHeader,
    StatBadge,
    type DataTableColumn,
} from '@/components/data-page';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types';
import almacen from './almacen-routes';
import { MovimientoFormModal } from './components/movimiento-form-modal';
import type { AlmacenProducto, MovimientoInventario } from './types';

type Props = {
    producto: AlmacenProducto;
    movimientos: Paginated<MovimientoInventario>;
    filters: { per_page: number };
};

export default function Kardex({ producto, movimientos, filters }: Props) {
    const { t } = useTranslation(['almacen', 'common']);
    const { can } = usePermission();
    const canAjustar = can('almacen.ajustar');
    const [adjustOpen, setAdjustOpen] = useState(false);

    const columns = useMemo<DataTableColumn<MovimientoInventario>[]>(
        () => [
            {
                key: 'fecha',
                header: t('kardex.columns.fecha'),
                cell: (m) => (
                    <span className="text-sm tabular-nums text-muted-foreground">
                        {m.created_at
                            ? new Date(m.created_at).toLocaleString()
                            : '—'}
                    </span>
                ),
            },
            {
                key: 'tipo',
                header: t('kardex.columns.tipo'),
                cell: (m) => (
                    <StatBadge
                        label={t(`movimiento_form.tipos.${m.tipo}`, {
                            defaultValue: m.tipo,
                        })}
                        value=""
                        variant="muted"
                    />
                ),
            },
            {
                key: 'cantidad',
                header: t('kardex.columns.cantidad'),
                align: 'right',
                cell: (m) => (
                    <span className="tabular-nums text-sm font-medium">
                        {m.cantidad}
                    </span>
                ),
            },
            {
                key: 'anterior',
                header: t('kardex.columns.anterior'),
                align: 'right',
                cell: (m) => (
                    <span className="tabular-nums text-sm text-muted-foreground">
                        {m.stock_anterior}
                    </span>
                ),
                className: 'hidden md:table-cell',
            },
            {
                key: 'despues',
                header: t('kardex.columns.despues'),
                align: 'right',
                cell: (m) => (
                    <span className="tabular-nums text-sm font-semibold">
                        {m.stock_despues}
                    </span>
                ),
            },
            {
                key: 'motivo',
                header: t('kardex.columns.motivo'),
                cell: (m) => (
                    <span className="line-clamp-1 text-sm text-muted-foreground">
                        {m.motivo ?? '—'}
                    </span>
                ),
                className: 'hidden lg:table-cell',
            },
            {
                key: 'usuario',
                header: t('kardex.columns.usuario'),
                cell: (m) => (
                    <span className="text-sm">{m.user?.name ?? '—'}</span>
                ),
                className: 'hidden xl:table-cell',
            },
        ],
        [t],
    );

    return (
        <>
            <Head title={`${t('kardex.title')} · ${producto.nombre}`} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('kardex.title')}
                    description={t('kardex.subtitle', {
                        name: producto.nombre,
                    })}
                    action={
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                asChild
                                className="cursor-pointer gap-2"
                            >
                                <Link href={almacen.index().url}>
                                    <ArrowLeft className="size-4" />
                                    {t('actions.back')}
                                </Link>
                            </Button>
                            <Can permission="almacen.export">
                                <Button
                                    type="button"
                                    variant="export"
                                    className="cursor-pointer gap-2"
                                    onClick={() => {
                                        window.location.href =
                                            almacen.kardexExport(
                                                producto.id,
                                            ).url;
                                    }}
                                >
                                    <Download className="size-4" />
                                    {t('kardex.export')}
                                </Button>
                            </Can>
                            {canAjustar &&
                            producto.control_inventario === 'sku' ? (
                                <Button
                                    type="button"
                                    onClick={() => setAdjustOpen(true)}
                                    className="cursor-pointer gap-2"
                                >
                                    <Package className="size-4" />
                                    {t('actions.adjust')}
                                </Button>
                            ) : null}
                        </div>
                    }
                />

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>
                        {t('columns.stock')}:{' '}
                        <strong className="text-foreground">
                            {producto.stock ?? '—'}
                        </strong>
                    </span>
                    <span>
                        {t('columns.control')}:{' '}
                        <strong className="text-foreground">
                            {t(`control.${producto.control_inventario}`)}
                        </strong>
                    </span>
                </div>

                <DataTable
                    columns={columns}
                    data={movimientos.data}
                    rowKey={(row) => row.id}
                    footer={
                        <DataPagination
                            meta={movimientos}
                            preservedQuery={{
                                per_page: filters.per_page,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={ScrollText}
                            title={t('kardex.empty_title')}
                            description={t('kardex.empty_description')}
                            action={
                                canAjustar &&
                                producto.control_inventario === 'sku' ? (
                                    <Button
                                        type="button"
                                        onClick={() => setAdjustOpen(true)}
                                        className="cursor-pointer gap-2"
                                    >
                                        <Package className="size-4" />
                                        {t('actions.adjust')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <MovimientoFormModal
                open={adjustOpen}
                onOpenChange={setAdjustOpen}
                producto={producto}
            />
        </>
    );
}

Kardex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Almacén', href: '/almacen' },
            { title: 'Kardex' },
        ]}
    >
        {page}
    </AppLayout>
);

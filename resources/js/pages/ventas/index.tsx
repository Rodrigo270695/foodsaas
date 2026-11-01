import { Head, Link } from '@inertiajs/react';
import {
    Banknote,
    Plus,
    Receipt,
    ShoppingCart,
    Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/components/can';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    PageHeader,
} from '@/components/data-page';
import type { DataTableColumn } from '@/components/data-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import AppLayout from '@/layouts/app-layout';
import { formatPeruDateTime } from '@/lib/format-peru-datetime';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import caja from '../caja/caja-routes';
import ventas from './ventas-routes';

type VentaRow = {
    id: string;
    numero: string | null;
    origen: string;
    tipo_comprobante: string;
    cliente_nombre: string | null;
    cliente_documento: string | null;
    estado: string;
    total: string | number;
    created_at: string;
    pedido?: {
        id: string;
        numero: number;
        canal: string;
        mesa?: { id: string; codigo: string; nombre: string | null } | null;
    } | null;
    sede?: { id: string; nombre: string; codigo: string } | null;
    pagos: { id: string; medio: string; monto: string | number }[];
    createdBy?: { id: number; name: string } | null;
    created_by?: { id: number; name: string } | null;
};

type Props = {
    sesion_abierta: boolean;
    ventas: Paginated<VentaRow>;
    medios: string[];
    tipos_comprobante: string[];
    filters: {
        sede_id: string | null;
        search: string;
        estado: string;
        medio: string;
        tipo: string;
        fecha: string;
        per_page: number;
        sort: string | null;
        direction: 'asc' | 'desc' | null;
    };
    stats: {
        pendientes: number;
        monto_total: number;
        ventas: number;
        pagadas: number;
        anuladas: number;
        coincidencias: number;
    };
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

export default function Index({
    sesion_abierta,
    ventas: paginated,
    medios,
    tipos_comprobante,
    filters,
    stats,
}: Props) {
    const { t } = useTranslation(['ventas', 'caja', 'common']);

    const { isLoading, search, setSearch, setPerPage, applyFilter, setSort, sort } =
        useDataTablePage<{
            estado: string;
            medio: string;
            tipo: string;
            fecha: string;
        }>({
            routeUrl: ventas.index().url,
            initialFilters: {
                ...filters,
                sort: filters.sort,
                direction: filters.direction,
            },
            only: ['ventas', 'filters', 'stats'],
            errorMessage: t('common:toast.load_error', {
                defaultValue: 'No se pudo cargar el historial.',
            }),
            storageKey: 'foodsaas.ventas.prefs',
            defaults: { per_page: 25 },
        });

    const columns = useMemo<DataTableColumn<VentaRow>[]>(
        () => [
            {
                key: 'numero',
                header: t('columns.numero'),
                sortable: true,
                sortKey: 'numero',
                cell: (row) => (
                    <span className="font-medium text-brand-600 tabular-nums">
                        {row.numero ??
                            (row.pedido ? `#${row.pedido.numero}` : '—')}
                    </span>
                ),
            },
            {
                key: 'fecha',
                header: t('columns.fecha'),
                sortable: true,
                sortKey: 'created_at',
                cell: (row) => {
                    const dt = formatPeruDateTime(row.created_at);
                    return (
                        <span className="tabular-nums text-muted-foreground">
                            {dt.fecha}, {dt.hora}
                        </span>
                    );
                },
            },
            {
                key: 'cliente',
                header: t('columns.cliente'),
                cell: (row) => (
                    <div className="min-w-0">
                        <p className="truncate font-medium">
                            {row.cliente_nombre?.trim() || 'Varios'}
                        </p>
                        {row.cliente_documento ? (
                            <p className="truncate text-xs text-muted-foreground">
                                {row.cliente_documento}
                            </p>
                        ) : null}
                        {row.origen === 'rapida' ? (
                            <p className="text-xs text-muted-foreground">
                                {t('origen.rapida')}
                            </p>
                        ) : row.pedido?.mesa ? (
                            <p className="text-xs text-muted-foreground">
                                {row.pedido.mesa.nombre?.trim() ||
                                    row.pedido.mesa.codigo}
                            </p>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'total',
                header: t('columns.total'),
                sortable: true,
                sortKey: 'total',
                align: 'right',
                cell: (row) => (
                    <span className="font-semibold tabular-nums">
                        {money(row.total)}
                    </span>
                ),
            },
            {
                key: 'metodo',
                header: t('columns.metodo'),
                cell: (row) => (
                    <span className="text-xs text-muted-foreground">
                        {row.pagos.length === 0
                            ? '—'
                            : row.pagos
                                  .map((p) => t(`caja:medios.${p.medio}`))
                                  .join(' · ')}
                    </span>
                ),
            },
            {
                key: 'estado',
                header: t('columns.estado'),
                sortable: true,
                sortKey: 'estado',
                cell: (row) => (
                    <Badge
                        variant={
                            row.estado === 'anulada' ? 'destructive' : 'default'
                        }
                        className={cn(
                            row.estado === 'pagada' &&
                                'border-transparent bg-emerald-600 text-white',
                        )}
                    >
                        {t(`estado.${row.estado}`, {
                            defaultValue: row.estado,
                        })}
                    </Badge>
                ),
            },
            {
                key: 'comprobante',
                header: t('columns.comprobante'),
                cell: (row) => (
                    <div className="space-y-0.5">
                        <p className="text-sm">
                            {t(`tipo.${row.tipo_comprobante}`, {
                                defaultValue: row.tipo_comprobante,
                            })}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                            {t('sunat.sin_comprobante')}
                        </p>
                    </div>
                ),
            },
        ],
        [t],
    );

    return (
        <>
            <Head title={t('title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('description')}
                    stats={[
                        {
                            label: t('stats.monto_total'),
                            value: money(stats.monto_total),
                            variant: 'success',
                            icon: Banknote,
                        },
                        {
                            label: t('stats.ventas'),
                            value: stats.ventas,
                            variant: 'info',
                            icon: Receipt,
                        },
                        {
                            label: t('stats.pagadas'),
                            value: stats.pagadas,
                            variant: 'success',
                            icon: Wallet,
                        },
                        {
                            label: t('stats.anuladas'),
                            value: stats.anuladas,
                            variant: 'danger',
                            icon: Receipt,
                            hideOnMobile: true,
                        },
                        {
                            label: t('stats.pendientes'),
                            value: stats.pendientes,
                            variant: 'warning',
                            icon: ShoppingCart,
                        },
                        {
                            label: t('stats.coincidencias'),
                            value: stats.coincidencias,
                            variant: 'muted',
                            icon: Receipt,
                            hideOnMobile: true,
                        },
                    ]}
                    action={
                        <>
                            <Can
                                permission={[
                                    'ventas.view',
                                    'caja.view',
                                    'caja.cobrar',
                                    'pedidos.cobrar',
                                ]}
                            >
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer gap-1.5"
                                    asChild
                                >
                                    <Link href={ventas.pendientes().url}>
                                        <ShoppingCart className="size-4" aria-hidden />
                                        {t('actions.pendientes')}
                                        {stats.pendientes > 0 ? (
                                            <Badge className="ml-0.5">
                                                {stats.pendientes}
                                            </Badge>
                                        ) : null}
                                    </Link>
                                </Button>
                            </Can>
                            <Can
                                permission={[
                                    'ventas.create',
                                    'caja.cobrar',
                                    'pedidos.cobrar',
                                ]}
                            >
                                <Button
                                    type="button"
                                    size="sm"
                                    className="cursor-pointer gap-1.5"
                                    asChild
                                >
                                    <Link
                                        href={
                                            sesion_abierta
                                                ? ventas.create().url
                                                : caja.index().url
                                        }
                                    >
                                        <Plus className="size-4" aria-hidden />
                                        {t('actions.nueva')}
                                    </Link>
                                </Button>
                            </Can>
                        </>
                    }
                />

                {!sesion_abierta ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-amber-950 dark:text-amber-100">
                            <strong>{t('caja_cerrada')}</strong>
                            {' — '}
                            {t('caja_cerrada_hint')}
                        </p>
                        <Can permission="caja.abrir">
                            <Button type="button" size="sm" asChild>
                                <Link href={caja.index().url}>{t('ir_caja')}</Link>
                            </Button>
                        </Can>
                    </div>
                ) : null}

                <DataToolbar
                    search={search}
                    onSearchChange={setSearch}
                    placeholder={t('filters.search')}
                    isSearching={isLoading}
                    searchWrapperClassName="sm:max-w-md"
                >
                    <Select
                        value={filters.estado}
                        onValueChange={(value) =>
                            applyFilter({ estado: value ?? 'todos' })
                        }
                    >
                        <SelectTrigger className="h-10 w-full cursor-pointer sm:w-[11rem]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">
                                {t('filters.estado_todos')}
                            </SelectItem>
                            <SelectItem value="pagada">{t('estado.pagada')}</SelectItem>
                            <SelectItem value="anulada">
                                {t('estado.anulada')}
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.medio}
                        onValueChange={(value) =>
                            applyFilter({ medio: value ?? 'todos' })
                        }
                    >
                        <SelectTrigger className="h-10 w-full cursor-pointer sm:w-[12rem]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">
                                {t('filters.medio_todos')}
                            </SelectItem>
                            {medios.map((m) => (
                                <SelectItem key={m} value={m}>
                                    {t(`caja:medios.${m}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.tipo}
                        onValueChange={(value) =>
                            applyFilter({ tipo: value ?? 'todos' })
                        }
                    >
                        <SelectTrigger className="h-10 w-full cursor-pointer sm:w-[12rem]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">
                                {t('filters.tipo_todos')}
                            </SelectItem>
                            {tipos_comprobante.map((tipo) => (
                                <SelectItem key={tipo} value={tipo}>
                                    {t(`tipo.${tipo}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Input
                        type="date"
                        value={filters.fecha}
                        aria-label={t('filters.fecha')}
                        className="h-10 w-full cursor-pointer sm:w-[11rem]"
                        onChange={(e) =>
                            applyFilter({ fecha: e.target.value || filters.fecha })
                        }
                    />
                </DataToolbar>

                {paginated.data.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        title={t('empty.ventas')}
                        description={t('empty.ventas_hint')}
                    />
                ) : (
                    <DataTable
                        columns={columns}
                        data={paginated.data}
                        rowKey={(row) => row.id}
                        sort={sort}
                        onSortChange={setSort}
                        footer={
                            <DataPagination
                                meta={paginated}
                                onPerPageChange={setPerPage}
                            />
                        }
                    />
                )}
            </div>
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Ventas', href: '/ventas' },
        ]}
    >
        {page}
    </AppLayout>
);

import { Head, Link, router } from '@inertiajs/react';
import {
    ClipboardList,
    CookingPot,
    MoreHorizontal,
    Plus,
    Store,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DataPagination,
    DataTable,
    EmptyState,
    PageHeader,
    type DataTableColumn,
} from '@/components/data-page';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types';
import pedidos from './pedidos-routes';

type MesaLibre = {
    id: string;
    codigo: string;
    nombre: string | null;
    capacidad: number;
};

type PedidoRow = {
    id: string;
    numero: number;
    estado: string;
    canal: string;
    total: string | number;
    created_at: string;
    mesa?: { id: string; codigo: string; nombre: string | null } | null;
    lineas_pendientes_count?: number;
    lineas_cola_count?: number;
};

type Props = {
    pedidos: Paginated<PedidoRow>;
    mesas_libres: MesaLibre[];
    filters: { estado: string; sede_id: string | null };
    stats: { activos: number; en_cola: number };
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

export default function Index({
    pedidos: paginated,
    mesas_libres,
    filters,
    stats,
}: Props) {
    const { t } = useTranslation(['pedidos', 'common']);
    const { can } = usePermission();
    const [openNew, setOpenNew] = useState(false);
    const [mesaId, setMesaId] = useState('');
    const [canal, setCanal] = useState<'salon' | 'mostrador'>('salon');
    const [comensales, setComensales] = useState(2);
    const [creating, setCreating] = useState(false);

    const { isLoading, setPerPage, applyFilter } = useDataTablePage<{
        estado: string;
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

    const estadoOptions = useMemo<readonly FilterSelectOption<string>[]>(
        () => [
            { value: 'activos', label: t('filters.activos'), tone: 'warning' },
            { value: 'cerrados', label: t('filters.cerrados'), tone: 'success' },
            { value: 'anulados', label: t('filters.anulados'), tone: 'warning' },
            { value: 'todos', label: t('filters.todos') },
        ],
        [t],
    );

    const columns = useMemo<DataTableColumn<PedidoRow>[]>(
        () => [
            {
                key: 'numero',
                header: t('columns.numero'),
                cell: (row) => (
                    <Link
                        href={pedidos.show(row.id).url}
                        className="font-semibold text-[#660033] hover:underline"
                    >
                        #{row.numero}
                    </Link>
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
                key: 'estado',
                header: t('columns.estado'),
                cell: (row) => t(`estado.${row.estado}`),
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
                key: 'hora',
                header: t('columns.hora'),
                cell: (row) =>
                    new Date(row.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
            },
            {
                key: 'actions',
                header: '',
                align: 'right',
                cell: (row) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={pedidos.show(row.id).url}>
                                    {t('actions.open')}
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
            },
        ],
        [t],
    );

    function submitNew() {
        setCreating(true);
        router.post(
            pedidos.store().url,
            {
                canal,
                mesa_id: canal === 'salon' ? mesaId || null : null,
                comensales,
            },
            {
                onFinish: () => setCreating(false),
                onSuccess: () => setOpenNew(false),
            },
        );
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
                            label: t('stats.activos'),
                            value: stats.activos,
                            variant: 'warning',
                            icon: ClipboardList,
                        },
                        {
                            label: t('stats.en_cola'),
                            value: stats.en_cola,
                            variant: 'info',
                            icon: CookingPot,
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

                <div className="flex flex-wrap items-center gap-3">
                    <FilterSelect
                        ariaLabel={t('filters.estado')}
                        value={filters.estado}
                        onChange={(estado) => applyFilter({ estado })}
                        options={estadoOptions}
                        disabled={isLoading}
                    />
                </div>

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(row) => row.id}
                    isLoading={isLoading}
                    footer={
                        <DataPagination
                            meta={paginated}
                            onPerPageChange={setPerPage}
                            preservedQuery={{
                                estado: filters.estado,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={ClipboardList}
                            title={t('empty.title')}
                            description={t('empty.description')}
                            action={
                                can('pedidos.create') ? (
                                    <Button
                                        type="button"
                                        onClick={() => setOpenNew(true)}
                                    >
                                        <Plus className="size-4" />
                                        {t('actions.new')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <Dialog open={openNew} onOpenChange={setOpenNew}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('actions.new')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t('columns.canal')}</Label>
                            <Select
                                value={canal}
                                onValueChange={(v) =>
                                    setCanal(v as 'salon' | 'mostrador')
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="salon">
                                        {t('canal.salon')}
                                    </SelectItem>
                                    <SelectItem value="mostrador">
                                        <span className="inline-flex items-center gap-2">
                                            <Store className="size-3.5" />
                                            {t('canal.mostrador')}
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {canal === 'salon' ? (
                            <div className="grid gap-2">
                                <Label>{t('form.mesa')}</Label>
                                <Select
                                    value={mesaId}
                                    onValueChange={setMesaId}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={t('form.mesa')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mesas_libres.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.nombre?.trim() || m.codigo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}
                        <div className="grid gap-2">
                            <Label>{t('form.comensales')}</Label>
                            <Input
                                type="number"
                                min={1}
                                max={99}
                                value={comensales}
                                onChange={(e) =>
                                    setComensales(Number(e.target.value) || 1)
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpenNew(false)}
                        >
                            {t('common:actions.cancel')}
                        </Button>
                        <Button
                            type="button"
                            disabled={
                                creating ||
                                (canal === 'salon' && mesaId === '')
                            }
                            onClick={submitNew}
                        >
                            {t('actions.open')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={[{ title: 'Pedidos', href: '/pedidos' }]}>
        {page}
    </AppLayout>
);

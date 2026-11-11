import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Boxes, Building2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DataTable,
    EmptyState,
    PageHeader,
    SearchField,
    StatBadge,
    type DataTableColumn,
} from '@/components/data-page';
import AppLayout from '@/layouts/app-layout';

type SedeStock = {
    sede_id: string;
    sede: string;
    stock: number;
    stock_minimo: number | null;
    item_id: string;
};

type ConsolidadoItem = {
    clave: string;
    nombre: string;
    tipo: 'insumo' | 'producto';
    unidad: string;
    stock_total: number;
    bajo_minimo: boolean;
    sedes: SedeStock[];
};

type Props = {
    items: ConsolidadoItem[];
    filters: { search: string };
    stats: { skus: number; bajo_minimo: number; sedes: number };
};

export default function Index({ items, filters, stats }: Props) {
    const { t } = useTranslation(['consolidado', 'common']);
    const [search, setSearch] = useState(filters.search);
    const [loading, setLoading] = useState(false);
    const first = useRef(true);

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const timer = window.setTimeout(() => {
            router.get(
                '/consolidado',
                { search: search.trim() || undefined },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['items', 'filters', 'stats'],
                    onStart: () => setLoading(true),
                    onFinish: () => setLoading(false),
                },
            );
        }, 350);
        return () => window.clearTimeout(timer);
    }, [search]);

    const columns = useMemo<DataTableColumn<ConsolidadoItem>[]>(
        () => [
            {
                key: 'nombre',
                header: t('columns.nombre'),
                cell: (row) => (
                    <span className="font-medium">{row.nombre}</span>
                ),
            },
            {
                key: 'tipo',
                header: t('columns.tipo'),
                className: 'hidden md:table-cell',
                cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                        {t(`tipos.${row.tipo}`)}
                    </span>
                ),
            },
            {
                key: 'stock_total',
                header: t('columns.stock_total'),
                align: 'right',
                cell: (row) => (
                    <span className="text-sm font-semibold tabular-nums">
                        {row.stock_total} {row.unidad}
                    </span>
                ),
            },
            {
                key: 'sedes',
                header: t('columns.sedes'),
                cell: (row) => (
                    <ul className="flex flex-col gap-0.5 text-xs">
                        {row.sedes.map((s) => (
                            <li
                                key={`${s.sede_id}-${s.item_id}`}
                                className="flex items-center justify-between gap-3"
                            >
                                <span className="text-muted-foreground">
                                    {s.sede}
                                </span>
                                <span className="tabular-nums">
                                    {s.stock}
                                    {s.stock_minimo !== null ? (
                                        <span className="ml-1 text-muted-foreground">
                                            (
                                            {t('minimo', {
                                                min: s.stock_minimo,
                                            })}
                                            )
                                        </span>
                                    ) : null}
                                </span>
                            </li>
                        ))}
                    </ul>
                ),
            },
            {
                key: 'estado',
                header: t('columns.estado'),
                cell: (row) => (
                    <StatBadge
                        label={
                            row.bajo_minimo ? t('estado.bajo') : t('estado.ok')
                        }
                        value=""
                        variant={row.bajo_minimo ? 'danger' : 'success'}
                    />
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
                            label: t('stats.skus'),
                            value: stats.skus,
                            icon: Boxes,
                            variant: 'info',
                        },
                        {
                            label: t('stats.bajo_minimo'),
                            value: stats.bajo_minimo,
                            icon: AlertTriangle,
                            variant:
                                stats.bajo_minimo > 0 ? 'danger' : 'success',
                        },
                        {
                            label: t('stats.sedes'),
                            value: stats.sedes,
                            icon: Building2,
                            variant: 'muted',
                        },
                    ]}
                />

                <div className="flex justify-end">
                    <SearchField
                        value={search}
                        onValueChange={setSearch}
                        placeholder={t('search_placeholder')}
                        isSearching={loading}
                        className="w-full sm:w-72"
                    />
                </div>

                <DataTable
                    columns={columns}
                    data={items}
                    rowKey={(row) => row.clave}
                    isLoading={loading}
                    emptyState={
                        <EmptyState
                            icon={Boxes}
                            title={t('empty.title')}
                            description={t('empty.description')}
                        />
                    }
                />
            </div>
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Consolidado', href: '/consolidado' },
        ]}
    >
        {page}
    </AppLayout>
);

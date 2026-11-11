import { Head } from '@inertiajs/react';
import { Gauge } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DataTable,
    EmptyState,
    PageHeader,
    SearchField,
    StatBadge,
    type DataTableColumn,
} from '@/components/data-page';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

type Limite = { usado: number; max: number | null };

type Row = {
    id: string;
    tenant: string | null;
    slug: string | null;
    plan: string | null;
    estado: string;
    limites: Partial<Record<'max_sedes' | 'max_usuarios', Limite>>;
};

type Props = {
    rows: Row[];
    planes: { id: string; codigo: string; nombre: string }[];
};

function UsoBar({ limite, label }: { limite?: Limite; label: string }) {
    if (!limite) return <span className="text-muted-foreground">—</span>;
    const pct =
        limite.max && limite.max > 0
            ? Math.min(100, (limite.usado / limite.max) * 100)
            : 0;
    const full = limite.max !== null && limite.usado >= limite.max;

    return (
        <div className="min-w-28" aria-label={label}>
            <p className="text-xs tabular-nums">
                {limite.usado} / {limite.max ?? '∞'}
            </p>
            {limite.max ? (
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                        className={cn(
                            'h-full rounded-full',
                            full ? 'bg-red-500' : 'bg-brand-600',
                        )}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            ) : null}
        </div>
    );
}

export default function Index({ rows, planes }: Props) {
    const { t } = useTranslation(['common']);
    const p = 'plataforma.uso_planes';
    const [search, setSearch] = useState('');
    const [plan, setPlan] = useState('todos');

    const planOptions = useMemo<readonly FilterSelectOption<string>[]>(
        () => [
            { value: 'todos', label: t(`${p}.filters.todos`) },
            ...planes.map((pl) => ({ value: pl.nombre, label: pl.nombre })),
        ],
        [planes, t],
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter(
            (r) =>
                (plan === 'todos' || r.plan === plan) &&
                (q === '' ||
                    (r.tenant ?? '').toLowerCase().includes(q) ||
                    (r.slug ?? '').toLowerCase().includes(q)),
        );
    }, [rows, search, plan]);

    const columns = useMemo<DataTableColumn<Row>[]>(
        () => [
            {
                key: 'tenant',
                header: t(`${p}.columns.tenant`),
                cell: (row) => (
                    <div>
                        <p className="font-medium">{row.tenant ?? '—'}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                            {row.slug}
                        </p>
                    </div>
                ),
            },
            {
                key: 'plan',
                header: t(`${p}.columns.plan`),
                cell: (row) => row.plan ?? '—',
            },
            {
                key: 'estado',
                header: t(`${p}.columns.estado`),
                className: 'hidden md:table-cell',
                cell: (row) => (
                    <StatBadge
                        label={row.estado}
                        value=""
                        variant={
                            row.estado === 'active'
                                ? 'success'
                                : row.estado === 'trial'
                                  ? 'info'
                                  : 'warning'
                        }
                    />
                ),
            },
            {
                key: 'sedes',
                header: t(`${p}.columns.sedes`),
                cell: (row) => (
                    <UsoBar
                        limite={row.limites.max_sedes}
                        label={t(`${p}.columns.sedes`)}
                    />
                ),
            },
            {
                key: 'usuarios',
                header: t(`${p}.columns.usuarios`),
                cell: (row) => (
                    <UsoBar
                        limite={row.limites.max_usuarios}
                        label={t(`${p}.columns.usuarios`)}
                    />
                ),
            },
        ],
        [t],
    );

    return (
        <>
            <Head title={t(`${p}.title`)} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t(`${p}.title`)}
                    description={t(`${p}.description`)}
                    stats={[
                        {
                            label: t(`${p}.columns.tenant`),
                            value: filtered.length,
                            icon: Gauge,
                            variant: 'info',
                        },
                    ]}
                />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <FilterSelect
                        ariaLabel={t(`${p}.filters.plan`)}
                        value={plan}
                        onChange={setPlan}
                        options={planOptions}
                    />
                    <SearchField
                        value={search}
                        onValueChange={setSearch}
                        placeholder={t(`${p}.search_placeholder`)}
                        className="w-full sm:w-72"
                    />
                </div>

                <DataTable
                    columns={columns}
                    data={filtered}
                    rowKey={(row) => row.id}
                    emptyState={
                        <EmptyState
                            icon={Gauge}
                            title={t(`${p}.empty.title`)}
                            description={t(`${p}.empty.description`)}
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
            { title: 'Plataforma' },
            { title: 'Uso de planes', href: '/plataforma/uso-planes' },
        ]}
    >
        {page}
    </AppLayout>
);

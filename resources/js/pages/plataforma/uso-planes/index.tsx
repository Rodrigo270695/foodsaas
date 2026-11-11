import { Head } from '@inertiajs/react';
import { Check, Gauge, Infinity as InfinityIcon, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MetricTile } from '@/components/plataforma/metric-tile';
import { Badge } from '@/components/ui/badge';
import { SearchField } from '@/components/data-page';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

type Limite = { usado: number | null; max: number | null };

type Row = {
    id: string;
    tenant: string | null;
    slug: string | null;
    plan: string | null;
    plan_codigo: string | null;
    estado: string;
    limites: Record<string, Limite>;
    features: Record<string, boolean>;
    features_on_count: number;
};

type Props = {
    rows: Row[];
    planes: { id: string; codigo: string; nombre: string }[];
    feature_labels: Record<string, string>;
};

const LIMIT_ORDER = [
    'max_sedes',
    'max_usuarios',
    'max_productos',
    'max_mesas',
    'max_pedidos_mes',
    'max_comprobantes_mes',
] as const;

function UsoCell({
    limite,
    label,
}: {
    limite?: Limite;
    label: string;
}) {
    if (!limite) {
        return <span className="text-muted-foreground">—</span>;
    }

    const unlimited = limite.max === null;
    const used = limite.usado;
    const pct =
        !unlimited && limite.max && limite.max > 0 && used !== null
            ? Math.min(100, (used / limite.max) * 100)
            : 0;
    const full =
        !unlimited && used !== null && limite.max !== null && used >= limite.max;

    return (
        <div className="min-w-[5.5rem]" aria-label={label}>
            <p className="flex items-center gap-1 text-xs font-medium tabular-nums">
                {used !== null ? used : '—'}
                <span className="text-muted-foreground">/</span>
                {unlimited ? (
                    <InfinityIcon className="size-3.5 text-muted-foreground" />
                ) : (
                    limite.max
                )}
            </p>
            {!unlimited ? (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                        className={cn(
                            'h-full rounded-full transition-all duration-500',
                            full
                                ? 'bg-rose-500'
                                : pct > 70
                                  ? 'bg-amber-500'
                                  : 'bg-brand-600',
                        )}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            ) : (
                <div className="mt-1.5 h-1.5 rounded-full bg-gradient-to-r from-brand-600/30 to-transparent" />
            )}
        </div>
    );
}

export default function Index({ rows, planes, feature_labels }: Props) {
    const { t } = useTranslation(['common']);
    const p = 'plataforma.uso_planes';
    const [search, setSearch] = useState('');
    const [plan, setPlan] = useState('todos');
    const [expanded, setExpanded] = useState<string | null>(null);

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

    const nearLimit = filtered.filter((r) =>
        LIMIT_ORDER.some((key) => {
            const l = r.limites[key];
            return (
                l &&
                l.usado !== null &&
                l.max !== null &&
                l.max > 0 &&
                l.usado / l.max >= 0.9
            );
        }),
    ).length;

    return (
        <>
            <Head title={t(`${p}.title`)} />
            <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 sm:p-6">
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-600/10 via-transparent to-transparent"
                    aria-hidden
                />

                <header className="relative space-y-2 border-b border-border/50 pb-5">
                    <Badge
                        variant="outline"
                        className="border-brand-600/30 bg-brand-600/5 text-brand-700"
                    >
                        <Gauge className="mr-1 size-3.5" />
                        Capacity
                    </Badge>
                    <h1 className="text-3xl font-semibold tracking-tight text-brand-800 dark:text-brand-100">
                        {t(`${p}.title`)}
                    </h1>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        {t(`${p}.description`)}
                    </p>
                </header>

                <section className="relative grid gap-3 sm:grid-cols-3">
                    <MetricTile
                        label="Restaurantes"
                        value={filtered.length}
                        icon={Gauge}
                        tone="brand"
                    />
                    <MetricTile
                        label="Cerca del límite"
                        value={nearLimit}
                        hint="≥ 90% en algún cupo"
                        tone={nearLimit > 0 ? 'warning' : 'success'}
                    />
                    <MetricTile
                        label="Features trackeadas"
                        value={Object.keys(feature_labels).length}
                        hint="Límites + módulos + FEL"
                        tone="info"
                    />
                </section>

                <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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

                <div className="relative space-y-3">
                    {filtered.length === 0 ? (
                        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                            {t(`${p}.empty.description`)}
                        </div>
                    ) : (
                        filtered.map((row) => {
                            const open = expanded === row.id;
                            const featureEntries = Object.entries(
                                row.features ?? {},
                            );

                            return (
                                <article
                                    key={row.id}
                                    className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm transition hover:border-brand-600/30"
                                >
                                    <button
                                        type="button"
                                        className="flex w-full cursor-pointer flex-col gap-4 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
                                        onClick={() =>
                                            setExpanded(open ? null : row.id)
                                        }
                                        aria-expanded={open}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate font-semibold">
                                                    {row.tenant ?? '—'}
                                                </p>
                                                <span
                                                    className={cn(
                                                        'rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
                                                        row.estado === 'active'
                                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                                                            : row.estado ===
                                                                'trial'
                                                              ? 'border-sky-500/30 bg-sky-500/10 text-sky-700'
                                                              : 'border-amber-500/30 bg-amber-500/10 text-amber-800',
                                                    )}
                                                >
                                                    {row.estado}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                                {row.slug} · {row.plan}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                            {LIMIT_ORDER.map((key) => (
                                                <div key={key}>
                                                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                        {feature_labels[key] ??
                                                            key}
                                                    </p>
                                                    <UsoCell
                                                        limite={
                                                            row.limites[key]
                                                        }
                                                        label={
                                                            feature_labels[
                                                                key
                                                            ] ?? key
                                                        }
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </button>

                                    {open ? (
                                        <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Módulos y facturación (
                                                {row.features_on_count} activos)
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {featureEntries.map(
                                                    ([key, on]) => (
                                                        <span
                                                            key={key}
                                                            className={cn(
                                                                'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium',
                                                                on
                                                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                                                                    : 'border-border/60 bg-background/60 text-muted-foreground',
                                                            )}
                                                        >
                                                            {on ? (
                                                                <Check className="size-3" />
                                                            ) : (
                                                                <X className="size-3 opacity-50" />
                                                            )}
                                                            {feature_labels[
                                                                key
                                                            ] ?? key}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    ) : null}
                                </article>
                            );
                        })
                    )}
                </div>
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

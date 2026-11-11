import { Head, Link } from '@inertiajs/react';
import {
    Building2,
    CreditCard,
    MapPin,
    Store,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MetricTile } from '@/components/plataforma/metric-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

type PlanRow = {
    codigo: string;
    nombre: string;
    precio: number;
    activas: number;
    mrr: number;
    features_on: string[];
};

type Props = {
    por_plan: PlanRow[];
    por_estado: Record<string, number>;
    totales: {
        tenants: number;
        subs: number;
        subs_vivas: number;
        sedes: number;
        mrr: number;
    };
    feature_labels: Record<string, string>;
};

function money(value: number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        maximumFractionDigits: 0,
    }).format(value);
}

const ESTADO_STYLE: Record<string, string> = {
    active: 'bg-emerald-500',
    trial: 'bg-sky-500',
    suspended: 'bg-amber-500',
    cancelled: 'bg-rose-500',
    grace: 'bg-violet-500',
};

export default function Index({
    por_plan,
    por_estado,
    totales,
    feature_labels,
}: Props) {
    const { t } = useTranslation(['common']);
    const p = 'plataforma.reportes';
    const maxActivas = Math.max(1, ...por_plan.map((r) => r.activas));
    const estados = Object.entries(por_estado);
    const estadoTotal = estados.reduce((acc, [, n]) => acc + Number(n), 0) || 1;

    const topPlan = useMemo(
        () =>
            [...por_plan].sort((a, b) => b.activas - a.activas)[0] ?? null,
        [por_plan],
    );

    return (
        <>
            <Head title={t(`${p}.title`)} />
            <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 sm:p-6">
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-600/10 via-transparent to-transparent"
                    aria-hidden
                />

                <header className="relative flex flex-col gap-4 border-b border-border/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <Badge
                            variant="outline"
                            className="border-brand-600/30 bg-brand-600/5 text-brand-700"
                        >
                            <TrendingUp className="mr-1 size-3.5" />
                            Insights
                        </Badge>
                        <h1 className="text-3xl font-semibold tracking-tight text-brand-800 dark:text-brand-100">
                            {t(`${p}.title`)}
                        </h1>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                            {t(`${p}.description`)}
                        </p>
                    </div>
                    <Button
                        asChild
                        variant="outline"
                        className="cursor-pointer gap-2"
                    >
                        <Link href="/plataforma/reportes/mapa">
                            <MapPin className="size-4" />
                            {t(`${p}.ver_mapa`)}
                        </Link>
                    </Button>
                </header>

                <section className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricTile
                        label={t(`${p}.totales.tenants`)}
                        value={totales.tenants}
                        icon={Building2}
                        tone="brand"
                    />
                    <MetricTile
                        label={t(`${p}.totales.subs_vivas`, {
                            defaultValue: 'Suscripciones vivas',
                        })}
                        value={totales.subs_vivas}
                        hint={`${totales.subs} totales`}
                        icon={CreditCard}
                        tone="info"
                    />
                    <MetricTile
                        label={t(`${p}.totales.sedes`)}
                        value={totales.sedes}
                        icon={Store}
                        tone="muted"
                    />
                    <MetricTile
                        label={t(`${p}.totales.mrr`, {
                            defaultValue: 'MRR estimado',
                        })}
                        value={money(totales.mrr)}
                        hint={
                            topPlan
                                ? `Líder: ${topPlan.nombre}`
                                : 'Sin suscripciones de pago'
                        }
                        icon={Wallet}
                        tone="success"
                    />
                </section>

                <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
                        <div className="border-b border-border/60 px-4 py-3">
                            <h2 className="text-sm font-semibold">
                                {t(`${p}.por_plan`)}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Activas, precio y módulos incluidos
                            </p>
                        </div>
                        <div className="divide-y">
                            {por_plan.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    {t(`${p}.empty`)}
                                </p>
                            ) : (
                                por_plan.map((r) => (
                                    <div
                                        key={r.codigo}
                                        className="space-y-3 px-4 py-3.5 transition hover:bg-muted/30"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="font-medium">
                                                    {r.nombre}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {money(r.precio)}/mes · MRR{' '}
                                                    {money(r.mrr)}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-brand-600/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand-800 dark:text-brand-100">
                                                {r.activas} activas
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-brand-700 to-brand-500 transition-all duration-500"
                                                style={{
                                                    width: `${(r.activas / maxActivas) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {r.features_on.length === 0 ? (
                                                <span className="text-[11px] text-muted-foreground">
                                                    Plan base
                                                </span>
                                            ) : (
                                                r.features_on.map((f) => (
                                                    <span
                                                        key={f}
                                                        className="rounded-md border border-border/60 bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                                    >
                                                        {feature_labels[f] ?? f}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
                        <div className="border-b border-border/60 px-4 py-3">
                            <h2 className="text-sm font-semibold">
                                {t(`${p}.por_estado`)}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Mix de salud de la cartera
                            </p>
                        </div>
                        <div className="space-y-4 p-4">
                            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                                {estados.map(([estado, total]) => (
                                    <div
                                        key={estado}
                                        title={`${estado}: ${total}`}
                                        className={cn(
                                            'h-full transition-all',
                                            ESTADO_STYLE[estado] ??
                                                'bg-slate-400',
                                        )}
                                        style={{
                                            width: `${(Number(total) / estadoTotal) * 100}%`,
                                        }}
                                    />
                                ))}
                            </div>
                            <ul className="space-y-2">
                                {estados.length === 0 ? (
                                    <li className="text-sm text-muted-foreground">
                                        {t(`${p}.empty`)}
                                    </li>
                                ) : (
                                    estados.map(([estado, total]) => (
                                        <li
                                            key={estado}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cn(
                                                        'size-2.5 rounded-full',
                                                        ESTADO_STYLE[estado] ??
                                                            'bg-slate-400',
                                                    )}
                                                />
                                                <span className="text-sm capitalize">
                                                    {estado}
                                                </span>
                                            </div>
                                            <span className="text-sm font-semibold tabular-nums">
                                                {total}
                                            </span>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Plataforma' },
            { title: 'Reportes', href: '/plataforma/reportes' },
        ]}
    >
        {page}
    </AppLayout>
);

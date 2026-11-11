import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowUpRight,
    Building2,
    Database,
    MonitorSmartphone,
    PauseCircle,
    Sparkles,
    Store,
    Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MetricTile } from '@/components/plataforma/metric-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

type Props = {
    stats: {
        tenants: number;
        activos: number;
        suspendidos: number;
        trial: number;
        subs_activas: number;
        usuarios: number;
        sedes: number;
        schemas: number;
    };
    recientes: {
        id: string;
        nombre: string;
        slug: string;
        estado: string;
        schema: string | null;
        created_at: string | null;
    }[];
    sesiones: {
        id: string;
        user_id: string | number;
        user_name: string;
        ip: string | null;
        browser: string;
        last_activity: string;
    }[];
    schemas: string[];
    quick_links: { href: string; label: string; hint: string }[];
};

function fmt(iso: string | null): string {
    return iso ? new Date(iso).toLocaleString('es-PE') : '—';
}

function estadoTone(estado: string): string {
    return matchEstado(estado, {
        active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        trial: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
        suspended:
            'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
        cancelled:
            'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        default: 'border-border bg-muted text-muted-foreground',
    });
}

function matchEstado(
    estado: string,
    map: Record<string, string> & { default: string },
): string {
    return map[estado] ?? map.default;
}

export default function Index({
    stats,
    recientes,
    sesiones,
    schemas,
    quick_links,
}: Props) {
    const { t } = useTranslation(['common']);
    const p = 'plataforma.operaciones';

    return (
        <>
            <Head title={t(`${p}.title`)} />
            <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 sm:p-6">
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-600/12 via-transparent to-transparent"
                    aria-hidden
                />

                <header className="relative flex flex-col gap-4 border-b border-border/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <Badge
                            variant="outline"
                            className="border-brand-600/30 bg-brand-600/5 text-brand-700"
                        >
                            <Activity className="mr-1 size-3.5" aria-hidden />
                            Live ops
                        </Badge>
                        <h1 className="text-balance text-3xl font-semibold tracking-tight text-brand-800 dark:text-brand-100">
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
                        <Link href="/plataforma/tenants">
                            Gestionar tenants
                            <ArrowUpRight className="size-4" aria-hidden />
                        </Link>
                    </Button>
                </header>

                <section className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricTile
                        label={t(`${p}.stats.tenants`)}
                        value={stats.tenants}
                        hint={`${stats.activos} activos · ${stats.trial} trial`}
                        icon={Building2}
                        tone="brand"
                        style={{ animationDelay: '0ms' }}
                        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
                    />
                    <MetricTile
                        label={t(`${p}.stats.activos`)}
                        value={stats.activos}
                        hint={
                            stats.suspendidos > 0
                                ? `${stats.suspendidos} suspendidos`
                                : 'Sin suspensiones'
                        }
                        icon={Sparkles}
                        tone="success"
                        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 [animation-delay:60ms]"
                    />
                    <MetricTile
                        label={t(`${p}.stats.subs_activas`)}
                        value={stats.subs_activas}
                        hint={`${stats.usuarios} usuarios · ${stats.sedes} sedes`}
                        icon={Users}
                        tone="info"
                        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 [animation-delay:120ms]"
                    />
                    <MetricTile
                        label={t(`${p}.stats.schemas`)}
                        value={stats.schemas}
                        hint={
                            stats.suspendidos > 0
                                ? 'Revisar tenants en pausa'
                                : 'Schemas rest_* listos'
                        }
                        icon={Database}
                        tone={stats.suspendidos > 0 ? 'warning' : 'muted'}
                        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 [animation-delay:180ms]"
                    />
                </section>

                <section className="relative grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {quick_links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="group rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-600/40 hover:shadow-md motion-reduce:transform-none"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-foreground">
                                    {link.label}
                                </p>
                                <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-brand-700" />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {link.hint}
                            </p>
                        </Link>
                    ))}
                </section>

                <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                            <div>
                                <h2 className="text-sm font-semibold">
                                    {t(`${p}.recientes`)}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Últimos alta / cambios visibles
                                </p>
                            </div>
                            <Store className="size-4 text-muted-foreground" />
                        </div>
                        <div className="divide-y">
                            {recientes.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    {t(`${p}.empty_recientes`)}
                                </p>
                            ) : (
                                recientes.map((r) => (
                                    <Link
                                        key={r.id}
                                        href={`/plataforma/tenants?search=${encodeURIComponent(r.slug)}`}
                                        className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-muted/40"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">
                                                {r.nombre}
                                            </p>
                                            <p className="font-mono text-xs text-muted-foreground">
                                                {r.slug}
                                                {r.schema
                                                    ? ` · ${r.schema}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <span
                                                className={cn(
                                                    'rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
                                                    estadoTone(r.estado),
                                                )}
                                            >
                                                {r.estado}
                                            </span>
                                            <span className="text-[11px] tabular-nums text-muted-foreground">
                                                {fmt(r.created_at)}
                                            </span>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </section>

                    <div className="grid gap-5">
                        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
                            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        {t(`${p}.sesiones`)}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Actividad reciente de login
                                    </p>
                                </div>
                                <MonitorSmartphone className="size-4 text-muted-foreground" />
                            </div>
                            <div className="max-h-72 divide-y overflow-y-auto">
                                {sesiones.length === 0 ? (
                                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                        {t(`${p}.empty_sesiones`)}
                                    </p>
                                ) : (
                                    sesiones.map((s) => (
                                        <div
                                            key={s.id}
                                            className="flex items-center justify-between gap-3 px-4 py-2.5"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    {s.user_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {s.browser} ·{' '}
                                                    <span className="font-mono">
                                                        {s.ip ?? '—'}
                                                    </span>
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                                {fmt(s.last_activity)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
                            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        {t(`${p}.schemas`)}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        PostgreSQL tenant schemas
                                    </p>
                                </div>
                                <Database className="size-4 text-muted-foreground" />
                            </div>
                            {schemas.length === 0 ? (
                                <p className="px-4 py-6 text-sm text-muted-foreground">
                                    {t(`${p}.empty_schemas`)}
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2 p-4">
                                    {schemas.map((s) => (
                                        <span
                                            key={s}
                                            className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 font-mono text-[11px]"
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {stats.suspendidos > 0 ? (
                                <div className="flex items-center gap-2 border-t border-border/60 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
                                    <PauseCircle className="size-3.5" />
                                    {stats.suspendidos} tenant(s) suspendidos —
                                    schemas pueden seguir existiendo.
                                </div>
                            ) : null}
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Plataforma' },
            { title: 'Operaciones', href: '/plataforma/operaciones' },
        ]}
    >
        {page}
    </AppLayout>
);

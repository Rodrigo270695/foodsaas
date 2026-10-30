import { Head } from '@inertiajs/react';
import {
    Armchair,
    Boxes,
    CheckCircle2,
    CreditCard,
    Gem,
    MapPin,
    ReceiptText,
    ShoppingBag,
    Users,
    XCircle,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/data-page';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { PlanLimitSemaphore } from '@/types/plan-limits';

type PlanPayload = {
    id: string;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    badge: string | null;
    color_hex: string | null;
    precio_mensual: number | null;
    precio_anual: number | null;
};

type SubscriptionPayload = {
    id: string;
    estado: string;
    ciclo: string;
    precio_pactado: number;
    descuento_pct: number;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    grace_ends_at: string | null;
    proximo_cobro_at: string | null;
    cancelled_at: string | null;
};

type UsageRow = {
    feature: string;
    limit: number | null;
    used: number;
    remaining: number | null;
    reached: boolean;
    unlimited: boolean;
    semaphore: PlanLimitSemaphore;
    usage_pct: number | null;
};

type ModuleRow = {
    feature: string;
    group: string;
    enabled: boolean;
};

type Props = {
    plan: PlanPayload | null;
    subscription: SubscriptionPayload | null;
    days_until_charge: number | null;
    usage: UsageRow[];
    modules: ModuleRow[];
    restaurant: {
        razon_social: string;
        nombre_comercial: string | null;
        slug: string;
    };
};

const FEATURE_ICONS: Record<
    string,
    React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
    max_sedes: MapPin,
    max_usuarios: Users,
    max_productos: Boxes,
    max_mesas: Armchair,
    max_comprobantes_mes: ReceiptText,
    max_pedidos_mes: ShoppingBag,
};

function usageFooterHint(
    feature: string,
    t: (key: string) => string,
): string {
    if (feature === 'max_pedidos_mes') {
        return t('usage.coming_soon');
    }
    if (feature === 'max_comprobantes_mes') {
        return t('usage.comprobantes_month');
    }
    if (
        feature === 'max_mesas' ||
        feature === 'max_productos' ||
        feature === 'max_usuarios' ||
        feature === 'max_sedes'
    ) {
        return t('usage.total_all_sedes');
    }

    return '';
}

function money(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return '—';
    }

    return `S/. ${value.toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatDate(iso: string | null, locale: string): string {
    if (!iso) {
        return '—';
    }

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return '—';
    }

    return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function semaphoreClass(s: PlanLimitSemaphore): string {
    if (s === 'red') {
        return 'bg-red-500/15 text-red-700 dark:text-red-300';
    }
    if (s === 'yellow') {
        return 'bg-amber-500/15 text-amber-800 dark:text-amber-300';
    }

    return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
}

function barClass(s: PlanLimitSemaphore): string {
    if (s === 'red') {
        return 'bg-red-500';
    }
    if (s === 'yellow') {
        return 'bg-amber-500';
    }

    return 'bg-emerald-500';
}

function planAccent(plan: PlanPayload | null): string {
    return plan?.color_hex?.trim() || '#1e3a5f';
}

export default function SuscripcionIndex({
    plan,
    subscription,
    days_until_charge,
    usage,
    modules,
    restaurant,
}: Props) {
    const { t, i18n } = useTranslation('suscripcion');
    const accent = planAccent(plan);
    const locale = i18n.language?.startsWith('en') ? 'en' : 'es';

    const heroBadge = useMemo(() => {
        if (!subscription) {
            return t('hero.badge_none');
        }
        if (subscription.estado === 'trial') {
            return t('hero.badge_trial');
        }
        if (subscription.estado === 'grace') {
            return t('hero.badge_grace');
        }

        return t('hero.badge_active');
    }, [subscription, t]);

    const daysLabel = useMemo(() => {
        if (days_until_charge === null) {
            return t('hero.no_date');
        }
        if (days_until_charge === 0) {
            return t('hero.days_today');
        }
        if (days_until_charge < 0) {
            return t('hero.days_overdue', {
                count: Math.abs(days_until_charge),
            });
        }
        if (days_until_charge === 1) {
            return t('hero.days_until_one');
        }

        return t('hero.days_until', { count: days_until_charge });
    }, [days_until_charge, t]);

    const planTitle =
        plan?.badge?.trim() ||
        plan?.nombre?.trim() ||
        t('empty.title');
    const cycleLabel = subscription
        ? t(`ciclos.${subscription.ciclo}`, {
              defaultValue: subscription.ciclo,
          })
        : '—';
    const nextChargeIso =
        subscription?.proximo_cobro_at ?? subscription?.current_period_end;
    const restaurantLabel =
        restaurant.nombre_comercial?.trim() || restaurant.razon_social;

    return (
        <>
            <Head title={t('title')} />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('title')}
                    description={t('description')}
                />

                {!plan && !subscription ? (
                    <div className="rounded-2xl border border-dashed bg-muted/30 px-6 py-12 text-center">
                        <Gem className="mx-auto size-10 text-muted-foreground" />
                        <h2 className="mt-3 text-lg font-semibold">
                            {t('empty.title')}
                        </h2>
                        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                            {t('empty.description')}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Hero */}
                        <section
                            className="relative overflow-hidden rounded-2xl px-5 py-6 text-white shadow-md sm:px-7 sm:py-7"
                            style={{
                                background: `linear-gradient(135deg, ${accent} 0%, #0f172a 100%)`,
                            }}
                        >
                            <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0 opacity-30"
                                style={{
                                    background:
                                        'radial-gradient(80% 120% at 100% 0%, rgba(255,255,255,0.25), transparent 55%)',
                                }}
                            />
                            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                                <div className="space-y-3">
                                    <span className="inline-flex items-center rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase backdrop-blur-sm">
                                        {heroBadge}
                                    </span>
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                            {planTitle}
                                            {subscription ? (
                                                <span className="ml-2 text-lg font-medium text-white/80 sm:text-xl">
                                                    {cycleLabel}
                                                </span>
                                            ) : null}
                                        </h2>
                                        <p className="mt-1 text-sm text-white/75">
                                            {restaurantLabel}
                                        </p>
                                    </div>
                                    <p className="text-3xl font-semibold tabular-nums tracking-tight">
                                        {money(
                                            subscription?.precio_pactado ??
                                                plan?.precio_mensual,
                                        )}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 sm:items-end">
                                    <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                                        <p className="text-sm font-medium">
                                            {daysLabel}
                                        </p>
                                        <p className="mt-0.5 text-xs text-white/70">
                                            {formatDate(nextChargeIso, locale)}
                                        </p>
                                    </div>
                                    <p className="max-w-xs text-xs text-white/65 sm:text-right">
                                        {t('hero.renew_hint')}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Detail cards */}
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <article className="rounded-2xl border bg-card p-4 shadow-sm">
                                <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                    {t('cards.your_plan')}
                                </h3>
                                <dl className="mt-3 space-y-2 text-sm">
                                    <div className="flex justify-between gap-2">
                                        <dt className="text-muted-foreground">
                                            {t('cards.plan')}
                                        </dt>
                                        <dd className="font-medium">
                                            {plan?.nombre ?? '—'}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <dt className="text-muted-foreground">
                                            {t('cards.cycle')}
                                        </dt>
                                        <dd className="font-medium">
                                            {cycleLabel}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <dt className="text-muted-foreground">
                                            {t('cards.base_price')}
                                        </dt>
                                        <dd className="font-medium tabular-nums">
                                            {money(
                                                subscription?.precio_pactado,
                                            )}
                                        </dd>
                                    </div>
                                    {(subscription?.descuento_pct ?? 0) >
                                    0 ? (
                                        <div className="flex justify-between gap-2">
                                            <dt className="text-muted-foreground">
                                                {t('cards.discount')}
                                            </dt>
                                            <dd className="font-medium tabular-nums">
                                                {subscription!.descuento_pct}%
                                            </dd>
                                        </div>
                                    ) : null}
                                </dl>
                            </article>

                            <article className="rounded-2xl border bg-card p-4 shadow-sm">
                                <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                    {t('cards.dates')}
                                </h3>
                                <dl className="mt-3 space-y-2 text-sm">
                                    <div className="flex justify-between gap-2">
                                        <dt className="text-muted-foreground">
                                            {t('cards.period_start')}
                                        </dt>
                                        <dd className="font-medium">
                                            {formatDate(
                                                subscription?.current_period_start ??
                                                    null,
                                                locale,
                                            )}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <dt className="text-muted-foreground">
                                            {t('cards.period_end')}
                                        </dt>
                                        <dd className="font-medium text-emerald-700 dark:text-emerald-400">
                                            {formatDate(
                                                subscription?.current_period_end ??
                                                    null,
                                                locale,
                                            )}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <dt className="text-muted-foreground">
                                            {t('cards.next_charge')}
                                        </dt>
                                        <dd className="font-medium text-emerald-700 dark:text-emerald-400">
                                            {formatDate(
                                                nextChargeIso ?? null,
                                                locale,
                                            )}
                                        </dd>
                                    </div>
                                    {subscription?.trial_ends_at ? (
                                        <div className="flex justify-between gap-2">
                                            <dt className="text-muted-foreground">
                                                {t('cards.trial_ends')}
                                            </dt>
                                            <dd className="font-medium">
                                                {formatDate(
                                                    subscription.trial_ends_at,
                                                    locale,
                                                )}
                                            </dd>
                                        </div>
                                    ) : null}
                                </dl>
                            </article>

                            <article className="rounded-2xl border bg-card p-4 shadow-sm">
                                <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                    {t('cards.renew')}
                                </h3>
                                <p className="mt-3 text-2xl font-semibold tabular-nums">
                                    {money(
                                        subscription?.precio_pactado ??
                                            plan?.precio_mensual,
                                    )}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t('cards.next_payment')}
                                </p>
                                <p className="mt-3 text-sm text-muted-foreground">
                                    {t('cards.renew_body')}
                                </p>
                            </article>

                            <article className="rounded-2xl border bg-card p-4 shadow-sm">
                                <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                    {t('cards.modules')}
                                </h3>
                                <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto text-sm">
                                    {modules.length === 0 ? (
                                        <li className="text-muted-foreground">
                                            —
                                        </li>
                                    ) : (
                                        modules.map((m) => (
                                            <li
                                                key={m.feature}
                                                className="flex items-center justify-between gap-2"
                                            >
                                                <span className="truncate">
                                                    {t(`modules.${m.feature}`, {
                                                        defaultValue:
                                                            m.feature,
                                                    })}
                                                </span>
                                                {m.enabled ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="size-3.5" />
                                                        <span className="sr-only">
                                                            {t(
                                                                'modules.included',
                                                            )}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-muted-foreground/60">
                                                        <XCircle className="size-3.5" />
                                                        <span className="sr-only">
                                                            {t(
                                                                'modules.not_included',
                                                            )}
                                                        </span>
                                                    </span>
                                                )}
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </article>
                        </div>

                        {/* Usage */}
                        <section className="space-y-3">
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight">
                                    {t('usage.title')}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {t('usage.subtitle')}
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
                                {usage.map((row) => {
                                    const Icon =
                                        FEATURE_ICONS[row.feature] ??
                                        CreditCard;
                                    const pct = row.unlimited
                                        ? 0
                                        : Math.min(
                                              100,
                                              row.usage_pct ?? 0,
                                          );
                                    const label = t(
                                        `features.${row.feature}`,
                                        { defaultValue: row.feature },
                                    );
                                    const hint = usageFooterHint(
                                        row.feature,
                                        t,
                                    );
                                    const remainingLabel = row.unlimited
                                        ? t('usage.unlimited')
                                        : row.remaining === 0
                                          ? t('usage.remaining_zero')
                                          : t('usage.remaining', {
                                                count: row.remaining ?? 0,
                                            });

                                    return (
                                        <article
                                            key={row.feature}
                                            className="rounded-2xl border bg-card p-4 shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                                                        <Icon
                                                            className="size-4 text-foreground"
                                                            strokeWidth={2.25}
                                                        />
                                                    </span>
                                                    <h3 className="text-sm font-semibold">
                                                        {label}
                                                    </h3>
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        'border-0 font-medium',
                                                        semaphoreClass(
                                                            row.semaphore,
                                                        ),
                                                    )}
                                                >
                                                    {t(
                                                        `semaphore.${row.semaphore}`,
                                                    )}
                                                </Badge>
                                            </div>

                                            <p className="mt-3 text-sm font-medium tabular-nums">
                                                {row.unlimited
                                                    ? t(
                                                          'usage.unlimited_with_used',
                                                          {
                                                              used: row.used,
                                                          },
                                                      )
                                                    : t('usage.of', {
                                                          used: row.used,
                                                          limit:
                                                              row.limit ?? 0,
                                                      })}
                                                {!row.unlimited &&
                                                row.usage_pct !== null ? (
                                                    <span className="ml-1 text-muted-foreground">
                                                        (
                                                        {t('usage.pct', {
                                                            pct: row.usage_pct,
                                                        })}
                                                        )
                                                    </span>
                                                ) : null}
                                            </p>

                                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className={cn(
                                                        'h-full rounded-full transition-all duration-500',
                                                        row.unlimited
                                                            ? 'w-full bg-muted-foreground/20'
                                                            : barClass(
                                                                  row.semaphore,
                                                              ),
                                                    )}
                                                    style={
                                                        row.unlimited
                                                            ? undefined
                                                            : {
                                                                  width: `${pct}%`,
                                                              }
                                                    }
                                                />
                                            </div>

                                            <p className="mt-2 text-xs text-muted-foreground">
                                                {row.feature ===
                                                'max_pedidos_mes'
                                                    ? hint
                                                    : hint
                                                      ? `${hint} · ${remainingLabel}`
                                                      : remainingLabel}
                                            </p>
                                            {row.feature ===
                                                'max_comprobantes_mes' &&
                                            row.used === 0 ? (
                                                <p className="mt-1 text-[11px] text-muted-foreground/80">
                                                    {t(
                                                        'usage.comprobantes_soon',
                                                    )}
                                                </p>
                                            ) : null}
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </>
    );
}

SuscripcionIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Configuración', href: '/configuracion/general' },
            {
                title: 'Mi suscripción',
                href: '/configuracion/suscripcion',
            },
        ]}
    >
        {page}
    </AppLayout>
);

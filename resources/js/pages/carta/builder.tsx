import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Clock3,
    FileDown,
    GripVertical,
    Sparkles,
    Wand2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import carta from './carta-routes';

type BuilderProps = {
    productos_count: number;
    areas_count: number;
};

export default function Builder({
    productos_count,
    areas_count,
}: BuilderProps) {
    const { t } = useTranslation('carta');

    return (
        <>
            <Head title={t('builder.title')} />

            <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
                <PageHeader
                    title={t('builder.title')}
                    description={t('builder.subtitle')}
                    action={
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer gap-2"
                        >
                            <Link href={carta.index().url}>
                                <ArrowLeft className="size-4" />
                                {t('builder.back')}
                            </Link>
                        </Button>
                    }
                />

                <section className="relative overflow-hidden rounded-3xl border border-brand-600/20 bg-gradient-to-br from-brand-50/80 via-background to-muted/40 p-6 sm:p-10 dark:from-brand-950/40">
                    <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-brand-500/15 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 left-10 size-48 rounded-full bg-emerald-400/10 blur-3xl" />

                    <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                        <div className="space-y-4">
                            <p className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-background/70 px-3 py-1 text-xs font-medium text-brand-800 dark:text-brand-200">
                                <Sparkles className="size-3.5" />
                                {t('builder.cta_soon')}
                            </p>
                            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                                {t('builder.hero_title')}
                            </h2>
                            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                                {t('builder.hero_body')}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span>
                                    {t('builder.stats_products', {
                                        count: productos_count,
                                    })}
                                </span>
                                <span>·</span>
                                <span>
                                    {t('builder.stats_areas', {
                                        count: areas_count,
                                    })}
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {(
                                [
                                    [GripVertical, t('builder.feature_drag')],
                                    [Wand2, t('builder.feature_motion')],
                                    [FileDown, t('builder.feature_pdf')],
                                    [Clock3, t('builder.feature_schedule')],
                                ] as const
                            ).map(([Icon, label]) => (
                                <div
                                    key={label}
                                    className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5"
                                >
                                    <Icon
                                        className="mb-2 size-5 text-brand-700 dark:text-brand-300"
                                        strokeWidth={2.25}
                                    />
                                    <p className="text-sm font-medium text-foreground">
                                        {label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

Builder.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Carta', href: '/carta' },
            { title: 'Armar' },
        ]}
    >
        {page}
    </AppLayout>
);

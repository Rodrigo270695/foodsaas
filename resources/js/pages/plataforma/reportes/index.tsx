import { Head, Link } from '@inertiajs/react';
import { Building2, CreditCard, MapPin, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';

type Props = {
    por_plan: {
        codigo: string;
        nombre: string;
        precio: number;
        activas: number;
    }[];
    por_estado: Record<string, number>;
    totales: { tenants: number; subs: number; sedes: number };
};

function money(value: number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
    }).format(value);
}

export default function Index({ por_plan, por_estado, totales }: Props) {
    const { t } = useTranslation(['common']);
    const p = 'plataforma.reportes';
    const maxActivas = Math.max(1, ...por_plan.map((r) => r.activas));
    const estados = Object.entries(por_estado);

    return (
        <>
            <Head title={t(`${p}.title`)} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t(`${p}.title`)}
                    description={t(`${p}.description`)}
                    stats={[
                        {
                            label: t(`${p}.totales.tenants`),
                            value: totales.tenants,
                            icon: Building2,
                            variant: 'info',
                        },
                        {
                            label: t(`${p}.totales.subs`),
                            value: totales.subs,
                            icon: CreditCard,
                            variant: 'primary',
                        },
                        {
                            label: t(`${p}.totales.sedes`),
                            value: totales.sedes,
                            icon: Store,
                            variant: 'muted',
                        },
                    ]}
                    action={
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer gap-2"
                        >
                            <Link href="/plataforma/reportes/mapa">
                                <MapPin className="size-4" />
                                <span className="hidden sm:inline">
                                    {t(`${p}.ver_mapa`)}
                                </span>
                            </Link>
                        </Button>
                    }
                />

                <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold">
                            {t(`${p}.por_plan`)}
                        </h2>
                        <div className="overflow-hidden rounded-xl border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2">
                                            {t(`${p}.columns.plan`)}
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            {t(`${p}.columns.precio`)}
                                        </th>
                                        <th className="px-3 py-2">
                                            {t(`${p}.columns.activas`)}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {por_plan.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-3 py-6 text-center text-muted-foreground"
                                            >
                                                {t(`${p}.empty`)}
                                            </td>
                                        </tr>
                                    ) : (
                                        por_plan.map((r) => (
                                            <tr key={r.codigo}>
                                                <td className="px-3 py-2 font-medium">
                                                    {r.nombre}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {money(r.precio)}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                                            <div
                                                                className="h-full rounded-full bg-brand-600"
                                                                style={{
                                                                    width: `${(r.activas / maxActivas) * 100}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="w-8 text-right tabular-nums">
                                                            {r.activas}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold">
                            {t(`${p}.por_estado`)}
                        </h2>
                        <div className="overflow-hidden rounded-xl border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2">
                                            {t(`${p}.columns.estado`)}
                                        </th>
                                        <th className="px-3 py-2 text-right">
                                            {t(`${p}.columns.total`)}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {estados.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={2}
                                                className="px-3 py-6 text-center text-muted-foreground"
                                            >
                                                {t(`${p}.empty`)}
                                            </td>
                                        </tr>
                                    ) : (
                                        estados.map(([estado, total]) => (
                                            <tr key={estado}>
                                                <td className="px-3 py-2 capitalize">
                                                    {estado}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {total}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
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

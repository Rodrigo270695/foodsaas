import { Head } from '@inertiajs/react';
import { Building2, Database, Store, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader, StatBadge } from '@/components/data-page';
import AppLayout from '@/layouts/app-layout';

type Props = {
    stats: {
        tenants: number;
        activos: number;
        suspendidos: number;
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
        created_at: string | null;
    }[];
    sesiones: {
        id: string;
        user_id: string | number;
        ip: string | null;
        ua: string;
        last_activity: string;
    }[];
    schemas: string[];
};

function fmt(iso: string | null): string {
    return iso ? new Date(iso).toLocaleString('es-PE') : '—';
}

export default function Index({ stats, recientes, sesiones, schemas }: Props) {
    const { t } = useTranslation(['common']);
    const p = 'plataforma.operaciones';

    return (
        <>
            <Head title={t(`${p}.title`)} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t(`${p}.title`)}
                    description={t(`${p}.description`)}
                    stats={[
                        {
                            label: t(`${p}.stats.tenants`),
                            value: stats.tenants,
                            icon: Building2,
                            variant: 'info',
                        },
                        {
                            label: t(`${p}.stats.activos`),
                            value: stats.activos,
                            variant: 'success',
                        },
                        {
                            label: t(`${p}.stats.suspendidos`),
                            value: stats.suspendidos,
                            variant:
                                stats.suspendidos > 0 ? 'warning' : 'muted',
                        },
                        {
                            label: t(`${p}.stats.subs_activas`),
                            value: stats.subs_activas,
                            variant: 'primary',
                            hideOnMobile: true,
                        },
                        {
                            label: t(`${p}.stats.usuarios`),
                            value: stats.usuarios,
                            icon: Users,
                            variant: 'default',
                            hideOnMobile: true,
                        },
                        {
                            label: t(`${p}.stats.sedes`),
                            value: stats.sedes,
                            icon: Store,
                            variant: 'default',
                            hideOnMobile: true,
                        },
                        {
                            label: t(`${p}.stats.schemas`),
                            value: stats.schemas,
                            icon: Database,
                            variant: 'muted',
                            hideOnMobile: true,
                        },
                    ]}
                />

                <section className="space-y-2">
                    <h2 className="text-lg font-semibold">
                        {t(`${p}.recientes`)}
                    </h2>
                    <div className="overflow-hidden rounded-xl border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2">
                                        {t(`${p}.columns.nombre`)}
                                    </th>
                                    <th className="hidden px-3 py-2 sm:table-cell">
                                        {t(`${p}.columns.slug`)}
                                    </th>
                                    <th className="px-3 py-2">
                                        {t(`${p}.columns.estado`)}
                                    </th>
                                    <th className="hidden px-3 py-2 md:table-cell">
                                        {t(`${p}.columns.creado`)}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {recientes.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-3 py-6 text-center text-muted-foreground"
                                        >
                                            {t(`${p}.empty_recientes`)}
                                        </td>
                                    </tr>
                                ) : (
                                    recientes.map((r) => (
                                        <tr key={r.id}>
                                            <td className="px-3 py-2 font-medium">
                                                {r.nombre}
                                            </td>
                                            <td className="hidden px-3 py-2 font-mono text-xs sm:table-cell">
                                                {r.slug}
                                            </td>
                                            <td className="px-3 py-2">
                                                <StatBadge
                                                    label={r.estado}
                                                    value=""
                                                    variant={
                                                        r.estado === 'activo'
                                                            ? 'success'
                                                            : 'warning'
                                                    }
                                                />
                                            </td>
                                            <td className="hidden px-3 py-2 tabular-nums md:table-cell">
                                                {fmt(r.created_at)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold">
                            {t(`${p}.sesiones`)}
                        </h2>
                        <div className="overflow-hidden rounded-xl border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2">
                                            {t(`${p}.columns.usuario`)}
                                        </th>
                                        <th className="px-3 py-2">
                                            {t(`${p}.columns.ip`)}
                                        </th>
                                        <th className="hidden px-3 py-2 md:table-cell">
                                            {t(`${p}.columns.navegador`)}
                                        </th>
                                        <th className="px-3 py-2">
                                            {t(`${p}.columns.actividad`)}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {sesiones.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-3 py-6 text-center text-muted-foreground"
                                            >
                                                {t(`${p}.empty_sesiones`)}
                                            </td>
                                        </tr>
                                    ) : (
                                        sesiones.map((s) => (
                                            <tr key={s.id}>
                                                <td className="px-3 py-2 tabular-nums">
                                                    {s.user_id}
                                                </td>
                                                <td className="px-3 py-2 font-mono text-xs">
                                                    {s.ip ?? '—'}
                                                </td>
                                                <td className="hidden px-3 py-2 text-xs text-muted-foreground md:table-cell">
                                                    {s.ua}
                                                </td>
                                                <td className="px-3 py-2 tabular-nums">
                                                    {fmt(s.last_activity)}
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
                            {t(`${p}.schemas`)}
                        </h2>
                        <div className="rounded-xl border p-3">
                            {schemas.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t(`${p}.empty_schemas`)}
                                </p>
                            ) : (
                                <ul className="max-h-80 space-y-1 overflow-y-auto font-mono text-xs">
                                    {schemas.map((s) => (
                                        <li key={s}>{s}</li>
                                    ))}
                                </ul>
                            )}
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
            { title: 'Operaciones', href: '/plataforma/operaciones' },
        ]}
    >
        {page}
    </AppLayout>
);

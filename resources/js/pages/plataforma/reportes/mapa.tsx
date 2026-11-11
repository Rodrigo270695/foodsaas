import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DataTable,
    EmptyState,
    PageHeader,
    type DataTableColumn,
} from '@/components/data-page';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';

type Punto = {
    id: string;
    nombre: string;
    slug: string;
    distrito: string | null;
    direccion: string | null;
};

type Props = { puntos: Punto[] };

export default function Mapa({ puntos }: Props) {
    const { t } = useTranslation(['common']);
    const p = 'plataforma.mapa';

    const columns = useMemo<DataTableColumn<Punto>[]>(
        () => [
            {
                key: 'nombre',
                header: t(`${p}.columns.nombre`),
                cell: (row) => (
                    <span className="font-medium">{row.nombre}</span>
                ),
            },
            {
                key: 'slug',
                header: t(`${p}.columns.slug`),
                className: 'hidden md:table-cell',
                cell: (row) => (
                    <span className="font-mono text-xs">{row.slug}</span>
                ),
            },
            {
                key: 'distrito',
                header: t(`${p}.columns.distrito`),
                cell: (row) => row.distrito ?? '—',
            },
            {
                key: 'direccion',
                header: t(`${p}.columns.direccion`),
                cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                        {row.direccion ?? '—'}
                    </span>
                ),
            },
            {
                key: 'mapa',
                header: '',
                align: 'right',
                cell: (row) => {
                    const q = [row.direccion, row.distrito]
                        .filter(Boolean)
                        .join(', ');
                    return q ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            asChild
                            className="cursor-pointer"
                        >
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={t(`${p}.ver_en_mapa`)}
                                title={t(`${p}.ver_en_mapa`)}
                            >
                                <ExternalLink className="size-4" />
                            </a>
                        </Button>
                    ) : null;
                },
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
                            label: t(`${p}.stats.total`),
                            value: puntos.length,
                            icon: MapPin,
                            variant: 'info',
                        },
                    ]}
                    action={
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer gap-2"
                        >
                            <Link href="/plataforma/reportes">
                                <ArrowLeft className="size-4" />
                                <span className="hidden sm:inline">
                                    {t(`${p}.volver`)}
                                </span>
                            </Link>
                        </Button>
                    }
                />

                <DataTable
                    columns={columns}
                    data={puntos}
                    rowKey={(row) => row.id}
                    emptyState={
                        <EmptyState
                            icon={MapPin}
                            title={t(`${p}.empty.title`)}
                            description={t(`${p}.empty.description`)}
                        />
                    }
                />
            </div>
        </>
    );
}

Mapa.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Plataforma' },
            { title: 'Reportes', href: '/plataforma/reportes' },
            { title: 'Mapa' },
        ]}
    >
        {page}
    </AppLayout>
);

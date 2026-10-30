import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import { formatPrecio } from '../lib/format-precio';
import carta from '../carta-routes';
import { resolveFondo } from './lib/fondos';
import type { MenuCartaDetail } from './types';

type PreviewProps = {
    carta: MenuCartaDetail;
    logo_url: string | null;
};

export default function Preview({ carta: menu, logo_url }: PreviewProps) {
    const { t } = useTranslation('carta');
    const theme = resolveFondo(menu.fondo_preset || 'cream');

    const byPage = useMemo(() => {
        const map = new Map<number, typeof menu.items>();
        for (let p = 1; p <= menu.paginas; p++) {
            map.set(p, []);
        }
        for (const item of menu.items) {
            const list = map.get(item.pagina) ?? [];
            list.push(item);
            map.set(item.pagina, list);
        }

        return map;
    }, [menu.items, menu.paginas]);

    return (
        <>
            <Head title={`${menu.nombre} · ${t('builder.preview')}`} />

            <div className="flex flex-1 flex-col gap-4 p-4 print:p-0 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                        className="cursor-pointer gap-2"
                    >
                        <Link href={carta.menus.edit(menu.id).url}>
                            <ArrowLeft className="size-4" />
                            {t('builder.back_canvas')}
                        </Link>
                    </Button>
                    <Button
                        type="button"
                        className="cursor-pointer gap-2"
                        onClick={() => window.print()}
                    >
                        <Printer className="size-4" />
                        {t('builder.pdf')}
                    </Button>
                </div>

                <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
                    {Array.from({ length: menu.paginas }, (_, i) => i + 1).map(
                        (page) => {
                            const items = byPage.get(page) ?? [];

                            return (
                                <section
                                    key={page}
                                    className={cn(
                                        'relative break-after-page overflow-hidden rounded-3xl border shadow-lg print:break-after-page print:rounded-none print:border-0 print:shadow-none',
                                        theme.canvasClass,
                                        theme.textClass,
                                    )}
                                >
                                    {logo_url ? (
                                        <img
                                            src={logo_url}
                                            alt=""
                                            aria-hidden
                                            className="pointer-events-none absolute top-1/2 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 opacity-[0.08] print:opacity-[0.12]"
                                        />
                                    ) : null}

                                    <header className="relative z-10 border-b border-black/10 px-8 py-8 dark:border-white/10">
                                        <p
                                            className={cn(
                                                'text-[10px] font-semibold tracking-[0.25em] uppercase',
                                                theme.mutedClass,
                                            )}
                                        >
                                            {t('builder.page_label', {
                                                page,
                                                pages: menu.paginas,
                                            })}
                                        </p>
                                        <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
                                            {menu.nombre}
                                        </h1>
                                        {menu.descripcion ? (
                                            <p
                                                className={cn(
                                                    'mt-2 max-w-md text-sm',
                                                    theme.mutedClass,
                                                )}
                                            >
                                                {menu.descripcion}
                                            </p>
                                        ) : null}
                                    </header>

                                    <div className="relative z-10 space-y-4 px-8 py-8">
                                        {items.map((item) => (
                                            <article
                                                key={item.id}
                                                className="flex items-start gap-4"
                                            >
                                                <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-black/10">
                                                    {item.producto
                                                        ?.imagen_url ? (
                                                        <img
                                                            src={
                                                                item.producto
                                                                    .imagen_url
                                                            }
                                                            alt=""
                                                            className="size-full object-cover"
                                                        />
                                                    ) : null}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline justify-between gap-3">
                                                        <h2 className="text-lg font-semibold">
                                                            {item.producto
                                                                ?.nombre ?? '—'}
                                                        </h2>
                                                        <span
                                                            className={cn(
                                                                'tabular-nums font-semibold',
                                                                theme.accentClass,
                                                            )}
                                                        >
                                                            {formatPrecio(
                                                                item.producto
                                                                    ?.precio ??
                                                                    '0',
                                                            )}
                                                        </span>
                                                    </div>
                                                    {item.producto
                                                        ?.descripcion ? (
                                                        <p
                                                            className={cn(
                                                                'mt-1 text-sm',
                                                                theme.mutedClass,
                                                            )}
                                                        >
                                                            {
                                                                item.producto
                                                                    .descripcion
                                                            }
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            );
                        },
                    )}
                </div>
            </div>
        </>
    );
}

Preview.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Carta', href: '/carta' },
            { title: 'Vista' },
        ]}
    >
        {page}
    </AppLayout>
);

import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import BlankLayout from '@/layouts/blank-layout';
import carta from '../carta-routes';
import { MenuDocument } from './components/menu-document';
import type { MenuCartaDetail } from './types';

type PreviewProps = {
    carta: MenuCartaDetail;
    logo_url: string | null;
    auto_print?: boolean;
};

export default function Preview({
    carta: menu,
    logo_url,
    auto_print = false,
}: PreviewProps) {
    const { t } = useTranslation('carta');

    useEffect(() => {
        if (!auto_print) {
            return;
        }
        const timer = window.setTimeout(() => {
            window.print();
        }, 400);

        return () => window.clearTimeout(timer);
    }, [auto_print]);

    return (
        <>
            <Head title={`${menu.nombre} · ${t('builder.pdf')}`} />

            <div className="mx-auto flex w-full max-w-[210mm] flex-col gap-4 px-3 py-4 print:p-0 sm:px-0 sm:py-8">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-white/90 px-3 py-2 shadow-sm print:hidden">
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

                <p className="text-center text-xs text-muted-foreground print:hidden">
                    {t('builder.print_hint', {
                        defaultValue:
                            'Usa «PDF / Imprimir» y elige «Guardar como PDF». Solo se imprime la hoja de la carta.',
                    })}
                </p>

                <MenuDocument
                    title={menu.nombre}
                    description={menu.descripcion}
                    fondo={menu.fondo_preset || 'cream'}
                    logoUrl={logo_url}
                    watermarkUrl={logo_url}
                    pages={menu.paginas}
                    items={menu.items}
                />
            </div>
        </>
    );
}

Preview.layout = (page: React.ReactNode) => <BlankLayout>{page}</BlankLayout>;

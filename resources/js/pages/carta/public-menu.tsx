import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BlankLayout from '@/layouts/blank-layout';
import { MenuDocument } from './builder/components/menu-document';
import type { MenuCartaDetail } from './builder/types';

type PublicMenuProps = {
    carta: MenuCartaDetail | null;
    logo_url: string | null;
    unpublished: boolean;
    nombre: string;
};

export default function PublicMenu({
    carta,
    logo_url,
    unpublished,
    nombre,
}: PublicMenuProps) {
    if (unpublished || !carta) {
        return (
            <>
                <Head title={nombre || 'Carta'} />
                <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-10 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-[#660033]/10 text-[#660033]">
                        <Lock className="size-6" />
                    </div>
                    <h1 className="text-xl font-semibold">
                        Carta aún no publicada
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        El restaurante debe activar «Publicar carta» para que el
                        enlace y el QR funcionen para clientes.
                    </p>
                    <Button type="button" variant="outline" asChild>
                        <Link href="/">
                            <ArrowLeft className="size-4" />
                            Volver
                        </Link>
                    </Button>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={carta.nombre} />
            <div className="mx-auto w-full max-w-[210mm] px-3 py-6 sm:px-0 sm:py-10">
                <MenuDocument
                    title={carta.nombre}
                    description={carta.descripcion}
                    fondo={carta.fondo_preset || 'cream'}
                    tipografia={carta.tipografia}
                    colorTexto={carta.color_texto}
                    logoUrl={logo_url}
                    pages={carta.paginas}
                    items={carta.items}
                />
            </div>
        </>
    );
}

PublicMenu.layout = (page: React.ReactNode) => (
    <BlankLayout>{page}</BlankLayout>
);

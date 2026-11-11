import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Lock, Utensils } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import BlankLayout from '@/layouts/blank-layout';
import { MenuDocument } from './builder/components/menu-document';
import type { MenuCartaDetail } from './builder/types';

type MesaPayload = {
    id: string;
    codigo: string;
    nombre: string | null;
};

type PublicMenuProps = {
    carta: MenuCartaDetail | null;
    logo_url: string | null;
    unpublished: boolean;
    fuera_vigencia?: boolean;
    nombre?: string;
    mesa?: MesaPayload | null;
    can_pedir?: boolean;
};

export default function PublicMenu({
    carta,
    logo_url,
    unpublished,
    fuera_vigencia = false,
    mesa = null,
    can_pedir = false,
}: PublicMenuProps) {
    const [opening, setOpening] = useState(false);

    if (!carta) {
        return (
            <>
                <Head title="Carta" />
                <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-10 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-[#660033]/10 text-[#660033]">
                        <Lock className="size-6" />
                    </div>
                    <h1 className="text-xl font-semibold">
                        Carta no disponible
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        El enlace no es válido o la carta aún no está publicada.
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

    const mesaLabel =
        mesa?.nombre?.trim() || mesa?.codigo || null;

    const abrirPedidoMesa = () => {
        if (!mesa || !can_pedir || opening) {
            return;
        }
        setOpening(true);
        router.post(
            '/pedidos',
            { mesa_id: mesa.id, canal: 'salon', comensales: 1 },
            { onFinish: () => setOpening(false) },
        );
    };

    return (
        <>
            <Head title={carta.nombre} />
            <div className="mx-auto w-full max-w-[210mm] px-3 py-6 sm:px-0 sm:py-10">
                {unpublished ? (
                    <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-800 dark:text-amber-200 print:hidden">
                        Vista previa (no publicada). Los clientes no ven este
                        enlace hasta que publiques la carta.
                    </p>
                ) : null}
                {fuera_vigencia ? (
                    <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-800 dark:text-amber-200 print:hidden">
                        Fuera de vigencia (horario o fechas). Solo visible para
                        staff con permiso.
                    </p>
                ) : null}
                {mesa && can_pedir ? (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#660033]/25 bg-[#660033]/5 px-4 py-3 print:hidden">
                        <div>
                            <p className="text-sm font-semibold text-[#660033]">
                                Mesa {mesaLabel}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Deep link mesero: abre un pedido en esta mesa.
                            </p>
                        </div>
                        <Button
                            type="button"
                            className="cursor-pointer gap-2 bg-[#660033] hover:bg-[#660033]/90"
                            disabled={opening}
                            onClick={abrirPedidoMesa}
                        >
                            <Utensils className="size-4" />
                            {opening ? 'Abriendo…' : 'Abrir pedido'}
                        </Button>
                    </div>
                ) : null}
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

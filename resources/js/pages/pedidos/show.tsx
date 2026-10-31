import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    CookingPot,
    Trash2,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/data-page';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePermission } from '@/hooks/use-permission';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import caja from '../caja/caja-routes';
import pedidos from './pedidos-routes';

type Linea = {
    id: string;
    nombre: string;
    cantidad: string | number;
    precio_unitario: string | number;
    importe: string | number;
    estado: string;
    notas: string | null;
    area?: { id: string; nombre: string } | null;
};

type Producto = {
    id: string;
    nombre: string;
    precio: string | number;
    categoria_id: string;
    stock: string | number | null;
    control_inventario: string;
};

type PedidoShow = {
    id: string;
    numero: number;
    estado: string;
    canal: string;
    comensales: number;
    subtotal: string | number;
    descuento: string | number;
    total: string | number;
    notas: string | null;
    mesa?: { id: string; codigo: string; nombre: string | null } | null;
    lineas: Linea[];
};

type Props = {
    pedido: PedidoShow;
    productos: Producto[];
    categorias: { id: string; nombre: string }[];
};

function money(value: string | number): string {
    return `S/ ${Number(value).toFixed(2)}`;
}

export default function Show({ pedido, productos, categorias }: Props) {
    const { t } = useTranslation(['pedidos', 'caja', 'common']);
    const { can } = usePermission();
    const activo =
        pedido.estado === 'borrador' || pedido.estado === 'abierto';
    const [search, setSearch] = useState('');
    const [categoriaId, setCategoriaId] = useState('todas');
    const [cobrarOpen, setCobrarOpen] = useState(false);
    const [medio, setMedio] = useState('efectivo');
    const [monto, setMonto] = useState(String(Number(pedido.total).toFixed(2)));
    const [descuento, setDescuento] = useState(String(pedido.descuento ?? 0));
    const [busy, setBusy] = useState(false);

    const pendientes = pedido.lineas.filter((l) => l.estado === 'pendiente');
    const cobrables = pedido.lineas.filter((l) =>
        ['en_cola', 'listo'].includes(l.estado),
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return productos.filter((p) => {
            if (categoriaId !== 'todas' && p.categoria_id !== categoriaId) {
                return false;
            }
            if (!q) {
                return true;
            }
            return p.nombre.toLowerCase().includes(q);
        });
    }, [productos, search, categoriaId]);

    function addProducto(productoId: string) {
        if (!activo || !can('pedidos.update')) {
            return;
        }
        router.post(
            pedidos.lineas.store(pedido.id).url,
            { producto_id: productoId, cantidad: 1 },
            { preserveScroll: true },
        );
    }

    function anularLinea(lineaId: string) {
        router.delete(pedidos.lineas.destroy(pedido.id, lineaId).url, {
            preserveScroll: true,
        });
    }

    function enviarCocina() {
        setBusy(true);
        router.post(
            pedidos.enviar(pedido.id).url,
            {},
            { preserveScroll: true, onFinish: () => setBusy(false) },
        );
    }

    function anularPedido() {
        if (!confirm(t('actions.anular'))) {
            return;
        }
        router.post(pedidos.anular(pedido.id).url);
    }

    function confirmarCobro() {
        setBusy(true);
        router.post(
            caja.cobrar(pedido.id).url,
            {
                descuento: Number(descuento) || 0,
                pagos: [{ medio, monto: Number(monto) || 0 }],
            },
            {
                onFinish: () => setBusy(false),
                onSuccess: () => setCobrarOpen(false),
            },
        );
    }

    return (
        <>
            <Head title={t('show_title', { numero: pedido.numero })} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('show_title', { numero: pedido.numero })}
                    description={
                        pedido.mesa
                            ? `${t('form.mesa')}: ${pedido.mesa.nombre?.trim() || pedido.mesa.codigo}`
                            : t(`canal.${pedido.canal}`)
                    }
                    action={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <Link href={pedidos.index().url}>
                                    <ArrowLeft className="size-4" />
                                    {t('title')}
                                </Link>
                            </Button>
                            {activo && pendientes.length > 0 ? (
                                <Can permission="pedidos.enviar">
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="gap-1.5"
                                        disabled={busy}
                                        onClick={enviarCocina}
                                    >
                                        <CookingPot className="size-4" />
                                        {t('actions.enviar')}
                                    </Button>
                                </Can>
                            ) : null}
                            {activo && cobrables.length > 0 ? (
                                <Can
                                    permission={[
                                        'pedidos.cobrar',
                                        'caja.cobrar',
                                    ]}
                                >
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="export"
                                        className="gap-1.5"
                                        onClick={() => {
                                            setMonto(
                                                String(
                                                    Number(pedido.total).toFixed(
                                                        2,
                                                    ),
                                                ),
                                            );
                                            setCobrarOpen(true);
                                        }}
                                    >
                                        <Wallet className="size-4" />
                                        {t('actions.cobrar')}
                                    </Button>
                                </Can>
                            ) : null}
                        </div>
                    }
                />

                <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
                    <section className="min-w-0 space-y-3">
                        {activo ? (
                            <>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Input
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                        placeholder={t('form.buscar_producto')}
                                        className="sm:flex-1"
                                    />
                                    <Select
                                        value={categoriaId}
                                        onValueChange={setCategoriaId}
                                    >
                                        <SelectTrigger className="sm:w-48">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todas">
                                                Todas
                                            </SelectItem>
                                            {categorias.map((c) => (
                                                <SelectItem
                                                    key={c.id}
                                                    value={c.id}
                                                >
                                                    {c.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid max-h-[28rem] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
                                    {filtered.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => addProducto(p.id)}
                                            disabled={!can('pedidos.update')}
                                            className="flex flex-col items-start gap-1 rounded-xl border border-border/70 bg-card/70 p-3 text-left transition hover:border-[#660033]/40 hover:bg-[#660033]/5"
                                        >
                                            <span className="line-clamp-2 text-sm font-medium">
                                                {p.nombre}
                                            </span>
                                            <span className="text-sm font-semibold tabular-nums text-[#660033]">
                                                {money(p.precio)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                                {t(`estado.${pedido.estado}`)}
                            </p>
                        )}
                    </section>

                    <aside className="space-y-3 rounded-2xl border bg-card/80 p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="font-semibold">Comanda</h2>
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                                {t(`estado.${pedido.estado}`)}
                            </span>
                        </div>
                        <ul className="max-h-[22rem] space-y-2 overflow-y-auto">
                            {pedido.lineas.length === 0 ? (
                                <li className="text-sm text-muted-foreground">
                                    Agrega productos de la carta.
                                </li>
                            ) : (
                                pedido.lineas.map((l) => (
                                    <li
                                        key={l.id}
                                        className={cn(
                                            'rounded-lg border px-3 py-2',
                                            l.estado === 'anulado' &&
                                                'opacity-50 line-through',
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    {Number(l.cantidad)} ×{' '}
                                                    {l.nombre}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {t(
                                                        `linea_estado.${l.estado}`,
                                                    )}
                                                    {l.area
                                                        ? ` · ${l.area.nombre}`
                                                        : ''}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <span className="text-sm tabular-nums">
                                                    {money(l.importe)}
                                                </span>
                                                {activo &&
                                                ['pendiente', 'en_cola'].includes(
                                                    l.estado,
                                                ) ? (
                                                    <Can permission="pedidos.update">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-destructive"
                                                            onClick={() =>
                                                                anularLinea(
                                                                    l.id,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </Can>
                                                ) : null}
                                            </div>
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                        <div className="space-y-1 border-t pt-3 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="tabular-nums">
                                    {money(pedido.subtotal)}
                                </span>
                            </div>
                            <div className="flex justify-between text-base font-semibold">
                                <span>Total</span>
                                <span className="tabular-nums text-[#660033]">
                                    {money(pedido.total)}
                                </span>
                            </div>
                        </div>
                        {activo ? (
                            <Can permission="pedidos.anular">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full text-destructive"
                                    onClick={anularPedido}
                                >
                                    {t('actions.anular')}
                                </Button>
                            </Can>
                        ) : null}
                    </aside>
                </div>
            </div>

            <Dialog open={cobrarOpen} onOpenChange={setCobrarOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('cobro.title')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t('cobro.descuento')}</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={descuento}
                                onChange={(e) => setDescuento(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('cobro.medio')}</Label>
                            <Select value={medio} onValueChange={setMedio}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[
                                        'efectivo',
                                        'tarjeta',
                                        'yape',
                                        'plin',
                                        'transferencia',
                                        'otro',
                                    ].map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {t(`caja:medios.${m}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('cobro.monto')}</Label>
                            <Input
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('cobro.total')}:{' '}
                            <strong className="text-foreground">
                                {money(
                                    Math.max(
                                        0,
                                        Number(pedido.subtotal) -
                                            (Number(descuento) || 0),
                                    ),
                                )}
                            </strong>
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCobrarOpen(false)}
                        >
                            {t('common:actions.cancel')}
                        </Button>
                        <Button
                            type="button"
                            disabled={busy}
                            className="gap-1.5"
                            onClick={confirmarCobro}
                        >
                            <Check className="size-4" />
                            {t('cobro.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Show.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Pedidos', href: '/pedidos' },
            { title: 'Detalle' },
        ]}
    >
        {page}
    </AppLayout>
);

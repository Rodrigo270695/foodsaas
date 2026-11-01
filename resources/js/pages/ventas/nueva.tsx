import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ShoppingCart, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/data-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import caja from '../caja/caja-routes';
import { CarritoPanel } from './components/carrito-panel';
import { ClienteComprobanteSection } from './components/cliente-comprobante-section';
import { CobroPanel } from './components/cobro-panel';
import { PedidosPickerModal } from './components/pedidos-picker-modal';
import { ProductosSearch } from './components/productos-search';
import {
    round2,
    type CartLine,
    type PedidoPendiente,
    type Producto,
} from './components/types';
import ventas from './ventas-routes';

type Props = {
    sesion_abierta: boolean;
    productos: Producto[];
    pedidos_pendientes: PedidoPendiente[];
    medios: string[];
    tipos_comprobante: string[];
    sede: { id: string; nombre: string; codigo: string } | null;
};

export default function Nueva({
    sesion_abierta,
    productos,
    pedidos_pendientes,
    medios,
    tipos_comprobante,
    sede,
}: Props) {
    const { t } = useTranslation(['ventas', 'caja', 'common']);
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [tipo, setTipo] = useState<string>(tipos_comprobante[0] ?? 'ticket');
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteDoc, setClienteDoc] = useState('');
    const [medio, setMedio] = useState(medios[0] ?? 'efectivo');
    const [descuento, setDescuento] = useState('0');
    const [montoRecibido, setMontoRecibido] = useState('');
    const [busy, setBusy] = useState(false);
    const [pedidosOpen, setPedidosOpen] = useState(false);
    const [pedidoActivo, setPedidoActivo] = useState<PedidoPendiente | null>(
        null,
    );

    const cobrandoPedido = pedidoActivo !== null;

    const filtered = useMemo(() => {
        const q = deferredQuery.trim().toLowerCase();
        if (q.length < 1) {
            return productos.slice(0, 18);
        }
        return productos
            .filter((p) => {
                const nombre = p.nombre.toLowerCase();
                const codigo = (p.codigo ?? '').toLowerCase();
                return nombre.includes(q) || codigo.includes(q);
            })
            .slice(0, 36);
    }, [productos, deferredQuery]);

    const subtotal = useMemo(
        () =>
            round2(
                cart.reduce((acc, line) => acc + line.precio * line.cantidad, 0),
            ),
        [cart],
    );
    const descuentoNum = Math.min(
        subtotal,
        Math.max(0, Number(descuento) || 0),
    );
    const total = round2(Math.max(0, subtotal - descuentoNum));
    const montoPago =
        montoRecibido === '' ? total : Math.max(0, Number(montoRecibido) || 0);
    const vuelto =
        medio === 'efectivo' && montoPago > total
            ? round2(montoPago - total)
            : 0;

    function addProduct(p: Producto) {
        if (cobrandoPedido) {
            return;
        }
        setCart((prev) => {
            const existing = prev.find((l) => l.producto_id === p.id);
            if (existing) {
                return prev.map((l) =>
                    l.producto_id === p.id
                        ? { ...l, cantidad: round2(l.cantidad + 1) }
                        : l,
                );
            }
            return [
                ...prev,
                {
                    key: p.id,
                    producto_id: p.id,
                    nombre: p.nombre,
                    precio: Number(p.precio),
                    cantidad: 1,
                },
            ];
        });
    }

    function setQty(key: string, cantidad: number) {
        if (cobrandoPedido) {
            return;
        }
        setCart((prev) =>
            prev
                .map((l) =>
                    l.key === key
                        ? { ...l, cantidad: round2(Math.max(0, cantidad)) }
                        : l,
                )
                .filter((l) => l.cantidad > 0),
        );
    }

    function seleccionarPedido(pedido: PedidoPendiente) {
        const lineas = (pedido.lineas ?? []).map((l) => ({
            key: l.id,
            producto_id: l.producto_id,
            nombre: l.nombre,
            precio: Number(l.precio_unitario),
            cantidad: Number(l.cantidad),
            locked: true,
        }));
        setPedidoActivo(pedido);
        setCart(lineas);
        setDescuento(String(Number(pedido.descuento) || 0));
        setMontoRecibido('');
        setPedidosOpen(false);
    }

    function limpiarPedido() {
        setPedidoActivo(null);
        setCart([]);
        setDescuento('0');
        setMontoRecibido('');
    }

    function canSubmit(): boolean {
        if (!sesion_abierta || cart.length === 0 || total <= 0 || busy) {
            return false;
        }
        if (!cobrandoPedido && tipo === 'factura') {
            const nombre = clienteNombre.trim();
            if (!nombre || nombre.toLowerCase() === 'varios') {
                return false;
            }
            if (!/^\d{11}$/.test(clienteDoc.trim())) {
                return false;
            }
        }
        if (montoPago < total && medio !== 'efectivo') {
            return false;
        }
        return true;
    }

    function registrar() {
        if (!sesion_abierta) {
            router.visit(caja.index().url);
            return;
        }
        if (!canSubmit()) {
            return;
        }

        setBusy(true);

        if (pedidoActivo) {
            router.post(
                ventas.cobrar(pedidoActivo.id).url,
                {
                    descuento: descuentoNum,
                    pagos: [{ medio, monto: montoPago }],
                },
                { onFinish: () => setBusy(false) },
            );
            return;
        }

        router.post(
            ventas.store().url,
            {
                tipo_comprobante: tipo,
                cliente_nombre: clienteNombre.trim() || 'Varios',
                cliente_documento: clienteDoc.trim() || null,
                descuento: descuentoNum,
                items: cart
                    .filter((l) => l.producto_id)
                    .map((l) => ({
                        producto_id: l.producto_id as string,
                        cantidad: l.cantidad,
                    })),
                pagos: [{ medio, monto: montoPago }],
            },
            { onFinish: () => setBusy(false) },
        );
    }

    const mesaLabel =
        pedidoActivo?.mesa?.nombre?.trim() ||
        pedidoActivo?.mesa?.codigo ||
        null;

    return (
        <>
            <Head title={t('nueva.title')} />
            <div className="flex flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-5">
                <PageHeader
                    title={t('nueva.title')}
                    description={
                        sede
                            ? t('nueva.sede_moneda', { sede: sede.nombre })
                            : t('nueva.description')
                    }
                    action={
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="cursor-pointer gap-1.5"
                                asChild
                            >
                                <Link href={ventas.index().url}>
                                    <ArrowLeft className="size-4" aria-hidden />
                                    <span className="hidden sm:inline">
                                        {t('actions.volver')}
                                    </span>
                                </Link>
                            </Button>
                            <Button
                                type="button"
                                variant="export"
                                size="sm"
                                className="cursor-pointer gap-1.5"
                                onClick={() => setPedidosOpen(true)}
                            >
                                <ShoppingCart className="size-4" aria-hidden />
                                {t('actions.pendientes')}
                                {pedidos_pendientes.length > 0 ? (
                                    <Badge className="bg-brand-600 text-white">
                                        {pedidos_pendientes.length}
                                    </Badge>
                                ) : null}
                            </Button>
                        </div>
                    }
                />

                {!sesion_abierta ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-amber-950 dark:text-amber-100">
                            <strong>{t('caja_cerrada')}</strong>
                            {' — '}
                            {t('nueva.sin_caja')}
                        </p>
                        <Button type="button" size="sm" asChild>
                            <Link href={caja.index().url}>{t('ir_caja')}</Link>
                        </Button>
                    </div>
                ) : null}

                {pedidoActivo ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-brand-500/25 bg-brand-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:bg-brand-950/30">
                        <div className="min-w-0 text-sm">
                            <p className="font-semibold text-brand-800 dark:text-brand-100">
                                {t('nueva.pedido_activo', {
                                    numero: pedidoActivo.numero,
                                })}
                                {mesaLabel
                                    ? ` · ${t('nueva.pedido_mesa', { mesa: mesaLabel })}`
                                    : null}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {t('nueva.pedido_locked_hint')}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer gap-1.5"
                            onClick={limpiarPedido}
                        >
                            <X className="size-3.5" aria-hidden />
                            {t('nueva.limpiar_pedido')}
                        </Button>
                    </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] lg:items-start">
                    <div className="space-y-3">
                        {!cobrandoPedido ? (
                            <ClienteComprobanteSection
                                tipo={tipo}
                                tiposComprobante={tipos_comprobante}
                                clienteNombre={clienteNombre}
                                clienteDoc={clienteDoc}
                                onTipoChange={setTipo}
                                onClienteNombreChange={setClienteNombre}
                                onClienteDocChange={setClienteDoc}
                            />
                        ) : null}

                        <div className="grid gap-3 xl:grid-cols-2">
                            {!cobrandoPedido ? (
                                <ProductosSearch
                                    query={query}
                                    onQueryChange={setQuery}
                                    productos={filtered}
                                    onAdd={addProduct}
                                />
                            ) : null}

                            <CarritoPanel
                                cart={cart}
                                subtotal={subtotal}
                                locked={cobrandoPedido}
                                onSetQty={setQty}
                                className={
                                    cobrandoPedido ? 'xl:col-span-2' : undefined
                                }
                            />
                        </div>
                    </div>

                    <CobroPanel
                        medios={medios}
                        medio={medio}
                        onMedioChange={setMedio}
                        descuento={descuento}
                        onDescuentoChange={setDescuento}
                        montoRecibido={montoRecibido}
                        onMontoRecibidoChange={setMontoRecibido}
                        subtotal={subtotal}
                        descuentoNum={descuentoNum}
                        total={total}
                        vuelto={vuelto}
                        canSubmit={canSubmit()}
                        busy={busy}
                        cobrandoPedido={cobrandoPedido}
                        onSubmit={registrar}
                    />
                </div>
            </div>

            <PedidosPickerModal
                open={pedidosOpen}
                onOpenChange={setPedidosOpen}
                pedidos={pedidos_pendientes}
                pedidoActivoId={pedidoActivo?.id ?? null}
                onSelect={seleccionarPedido}
            />
        </>
    );
}

Nueva.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Operación' },
            { title: 'Ventas', href: '/ventas' },
            { title: 'Nueva venta' },
        ]}
    >
        {page}
    </AppLayout>
);

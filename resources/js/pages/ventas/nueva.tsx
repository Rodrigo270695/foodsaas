import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Minus,
    Plus,
    Search,
    ShoppingBag,
    ShoppingCart,
    Trash2,
    Wallet,
    X,
} from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PageHeader } from '@/components/data-page';
import { FormModal } from '@/components/forms/form-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import caja from '../caja/caja-routes';
import ventas from './ventas-routes';

type Producto = {
    id: string;
    nombre: string;
    codigo: string | null;
    precio: string | number;
    imagen_url?: string | null;
    categoria?: { id: string; nombre: string } | null;
};

type PedidoLinea = {
    id: string;
    producto_id: string | null;
    nombre: string;
    precio_unitario: string | number;
    cantidad: string | number;
    importe: string | number;
    estado: string;
};

type PedidoPendiente = {
    id: string;
    numero: number;
    canal: string;
    total: string | number;
    subtotal: string | number;
    descuento: string | number;
    mesa?: { id: string; codigo: string; nombre: string | null } | null;
    openedBy?: { id: number; name: string } | null;
    opened_by?: { id: number; name: string } | null;
    lineas: PedidoLinea[];
};

type CartLine = {
    key: string;
    producto_id: string | null;
    nombre: string;
    precio: number;
    cantidad: number;
    locked?: boolean;
};

type Props = {
    sesion_abierta: boolean;
    productos: Producto[];
    pedidos_pendientes: PedidoPendiente[];
    medios: string[];
    tipos_comprobante: string[];
    sede: { id: string; nombre: string; codigo: string } | null;
};

function money(value: number): string {
    return `S/ ${value.toFixed(2)}`;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

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

    function clienteHint(): string {
        if (tipo === 'factura') {
            return t('nueva.cliente_hint_factura');
        }
        if (tipo === 'boleta') {
            return t('nueva.cliente_hint_boleta');
        }
        return t('nueva.cliente_hint_ticket');
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
                            <section className="rounded-xl border bg-card/70 p-3">
                                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="cliente"
                                            className="text-xs"
                                        >
                                            {t('nueva.cliente')}
                                        </Label>
                                        <Input
                                            id="cliente"
                                            value={clienteNombre}
                                            placeholder={t(
                                                'nueva.cliente_placeholder',
                                            )}
                                            onChange={(e) =>
                                                setClienteNombre(e.target.value)
                                            }
                                            className="h-9"
                                        />
                                        <p className="text-[11px] leading-snug text-muted-foreground">
                                            {clienteHint()}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5 sm:min-w-[14rem]">
                                        <Label className="text-xs">
                                            {t('nueva.comprobante')}
                                        </Label>
                                        <ToggleGroup
                                            type="single"
                                            value={tipo}
                                            onValueChange={(v) => {
                                                if (v) {
                                                    setTipo(v);
                                                }
                                            }}
                                            variant="outline"
                                            size="sm"
                                            className="grid w-full grid-cols-3"
                                        >
                                            {tipos_comprobante.map((item) => (
                                                <ToggleGroupItem
                                                    key={item}
                                                    value={item}
                                                    className="cursor-pointer px-2 text-xs capitalize"
                                                >
                                                    {t(`tipo.${item}`)}
                                                </ToggleGroupItem>
                                            ))}
                                        </ToggleGroup>
                                    </div>
                                </div>
                                {tipo !== 'ticket' ? (
                                    <div className="mt-3 space-y-1.5">
                                        <Label htmlFor="doc" className="text-xs">
                                            {t('nueva.documento')}
                                        </Label>
                                        <Input
                                            id="doc"
                                            value={clienteDoc}
                                            inputMode="numeric"
                                            placeholder={
                                                tipo === 'factura'
                                                    ? t(
                                                          'nueva.documento_placeholder_factura',
                                                      )
                                                    : t(
                                                          'nueva.documento_placeholder_boleta',
                                                      )
                                            }
                                            onChange={(e) =>
                                                setClienteDoc(
                                                    e.target.value
                                                        .replace(/\D/g, '')
                                                        .slice(0, 11),
                                                )
                                            }
                                            className="h-9 max-w-xs"
                                        />
                                    </div>
                                ) : null}
                            </section>
                        ) : null}

                        <div className="grid gap-3 xl:grid-cols-2">
                            {!cobrandoPedido ? (
                                <section className="flex min-h-0 flex-col rounded-xl border bg-card/70 p-3">
                                    <div className="mb-2 flex items-center gap-2">
                                        <Search
                                            className="size-3.5 text-muted-foreground"
                                            aria-hidden
                                        />
                                        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            {t('nueva.buscar')}
                                        </h2>
                                    </div>
                                    <Input
                                        value={query}
                                        placeholder={t(
                                            'nueva.buscar_placeholder',
                                        )}
                                        onChange={(e) =>
                                            setQuery(e.target.value)
                                        }
                                        className="mb-2 h-9"
                                    />
                                    <div className="grid max-h-[min(28rem,52vh)] gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-1">
                                        {filtered.map((p) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => addProduct(p)}
                                                className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-transparent bg-background px-2.5 py-2 text-left transition-colors hover:border-brand-500/35 hover:bg-brand-50/40 focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:bg-brand-950/30"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-medium">
                                                        {p.nombre}
                                                    </span>
                                                    {p.codigo ? (
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {p.codigo}
                                                        </span>
                                                    ) : null}
                                                </span>
                                                <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-700">
                                                    {money(Number(p.precio))}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            ) : null}

                            <section
                                className={cn(
                                    'flex min-h-0 flex-col rounded-xl border bg-card/70 p-3',
                                    cobrandoPedido && 'xl:col-span-2',
                                )}
                            >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <ShoppingBag
                                            className="size-3.5 text-muted-foreground"
                                            aria-hidden
                                        />
                                        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            {t('nueva.carrito')}
                                        </h2>
                                    </div>
                                    {cart.length > 0 ? (
                                        <span className="text-xs tabular-nums text-muted-foreground">
                                            {cart.length} · {money(subtotal)}
                                        </span>
                                    ) : null}
                                </div>
                                {cart.length === 0 ? (
                                    <EmptyState
                                        icon={ShoppingBag}
                                        title={t('empty.carrito')}
                                        description={t('empty.carrito_hint')}
                                    />
                                ) : (
                                    <ul className="divide-y overflow-y-auto rounded-lg border">
                                        {cart.map((line) => (
                                            <li
                                                key={line.key}
                                                className="flex items-center gap-2 px-2.5 py-2"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {line.nombre}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground tabular-nums">
                                                        {money(line.precio)}
                                                    </p>
                                                </div>
                                                {line.locked ? (
                                                    <span className="w-8 text-center text-sm tabular-nums">
                                                        {line.cantidad}
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-0.5">
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="outline"
                                                            className="size-7 cursor-pointer"
                                                            onClick={() =>
                                                                setQty(
                                                                    line.key,
                                                                    line.cantidad -
                                                                        1,
                                                                )
                                                            }
                                                            aria-label={t(
                                                                'actions.quitar',
                                                            )}
                                                        >
                                                            <Minus className="size-3" />
                                                        </Button>
                                                        <span className="w-7 text-center text-sm tabular-nums">
                                                            {line.cantidad}
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="outline"
                                                            className="size-7 cursor-pointer"
                                                            onClick={() =>
                                                                setQty(
                                                                    line.key,
                                                                    line.cantidad +
                                                                        1,
                                                                )
                                                            }
                                                            aria-label={t(
                                                                'actions.agregar',
                                                            )}
                                                        >
                                                            <Plus className="size-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                                <p className="w-[4.5rem] text-right text-sm font-semibold tabular-nums">
                                                    {money(
                                                        round2(
                                                            line.precio *
                                                                line.cantidad,
                                                        ),
                                                    )}
                                                </p>
                                                {!line.locked ? (
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-7 cursor-pointer text-destructive"
                                                        onClick={() =>
                                                            setQty(line.key, 0)
                                                        }
                                                        aria-label={t(
                                                            'actions.quitar',
                                                        )}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>
                    </div>

                    <aside className="space-y-3 rounded-xl border bg-card/80 p-3 shadow-sm lg:sticky lg:top-16">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Wallet
                                    className="size-3.5 text-muted-foreground"
                                    aria-hidden
                                />
                                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    {t('nueva.cobro')}
                                </h2>
                            </div>
                            {total > 0 ? (
                                <span className="text-sm font-semibold tabular-nums text-brand-700">
                                    {money(total)}
                                </span>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                            {medios.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMedio(m)}
                                    aria-pressed={medio === m}
                                    className={cn(
                                        'cursor-pointer rounded-md border px-2 py-2 text-center text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40',
                                        medio === m
                                            ? 'border-brand-600 bg-brand-600 text-white'
                                            : 'bg-background hover:bg-muted/50',
                                    )}
                                >
                                    {t(`caja:medios.${m}`)}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label
                                    htmlFor="descuento"
                                    className="text-xs"
                                >
                                    {t('nueva.descuento')}
                                </Label>
                                <Input
                                    id="descuento"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={descuento}
                                    onChange={(e) =>
                                        setDescuento(e.target.value)
                                    }
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="recibido" className="text-xs">
                                    {t('nueva.monto_recibido')}
                                </Label>
                                <Input
                                    id="recibido"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={montoRecibido}
                                    placeholder={total.toFixed(2)}
                                    onChange={(e) =>
                                        setMontoRecibido(e.target.value)
                                    }
                                    className="h-9"
                                />
                            </div>
                        </div>

                        <dl className="space-y-1 border-t pt-2.5 text-sm">
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">
                                    {t('nueva.subtotal')}
                                </dt>
                                <dd className="tabular-nums">
                                    {money(subtotal)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">
                                    {t('nueva.descuento')}
                                </dt>
                                <dd className="tabular-nums">
                                    −{money(descuentoNum)}
                                </dd>
                            </div>
                            {vuelto > 0 ? (
                                <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-300">
                                    <dt>{t('nueva.vuelto')}</dt>
                                    <dd className="tabular-nums">
                                        {money(vuelto)}
                                    </dd>
                                </div>
                            ) : null}
                            <div className="flex justify-between gap-3 pt-1 text-base font-semibold text-brand-700">
                                <dt>{t('nueva.total')}</dt>
                                <dd className="tabular-nums">{money(total)}</dd>
                            </div>
                        </dl>

                        <Button
                            type="button"
                            size="lg"
                            className="h-11 w-full cursor-pointer gap-2"
                            disabled={!canSubmit()}
                            onClick={registrar}
                        >
                            <Wallet className="size-4" aria-hidden />
                            {cobrandoPedido
                                ? t('nueva.cobrar_pedido')
                                : t('actions.registrar')}{' '}
                            — {money(total)}
                        </Button>
                    </aside>
                </div>
            </div>

            <FormModal
                open={pedidosOpen}
                onOpenChange={setPedidosOpen}
                title={t('nueva.modal_pedidos_title')}
                description={t('nueva.modal_pedidos_description')}
                size="lg"
                blockDismiss={false}
                footer={
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => setPedidosOpen(false)}
                    >
                        {t('common:actions.cancel', {
                            defaultValue: 'Cancelar',
                        })}
                    </Button>
                }
            >
                {pedidos_pendientes.length === 0 ? (
                    <EmptyState
                        icon={ShoppingCart}
                        title={t('nueva.modal_pedidos_empty')}
                        description={t('empty.pendientes_hint')}
                    />
                ) : (
                    <ul className="space-y-2">
                        {pedidos_pendientes.map((p) => {
                            const mesa =
                                p.mesa?.nombre?.trim() ||
                                p.mesa?.codigo ||
                                '—';
                            const mesero =
                                p.openedBy?.name ?? p.opened_by?.name ?? '—';
                            const selected = pedidoActivo?.id === p.id;

                            return (
                                <li key={p.id}>
                                    <button
                                        type="button"
                                        onClick={() => seleccionarPedido(p)}
                                        className={cn(
                                            'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/40',
                                            selected
                                                ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40'
                                                : 'bg-background hover:border-brand-400/40 hover:bg-muted/30',
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-brand-800 tabular-nums dark:text-brand-100">
                                                #{p.numero}
                                                <span className="ml-2 font-normal text-muted-foreground">
                                                    {mesa}
                                                </span>
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {mesero} ·{' '}
                                                {t('nueva.modal_pedidos_items', {
                                                    count: p.lineas?.length ?? 0,
                                                })}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="font-semibold tabular-nums">
                                                {money(Number(p.total))}
                                            </p>
                                            <p className="text-[11px] text-brand-700">
                                                {t('nueva.modal_pedidos_usar')}
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </FormModal>
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

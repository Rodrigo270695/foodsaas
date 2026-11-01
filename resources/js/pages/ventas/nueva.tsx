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
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PageHeader } from '@/components/data-page';
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

type CartLine = {
    producto_id: string;
    nombre: string;
    precio: number;
    cantidad: number;
};

type Props = {
    sesion_abierta: boolean;
    productos: Producto[];
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
    medios,
    tipos_comprobante,
    sede,
}: Props) {
    const { t } = useTranslation(['ventas', 'caja', 'common']);
    const [query, setQuery] = useState('');
    const [cart, setCart] = useState<CartLine[]>([]);
    const [tipo, setTipo] = useState<string>(tipos_comprobante[0] ?? 'ticket');
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteDoc, setClienteDoc] = useState('');
    const [medio, setMedio] = useState(medios[0] ?? 'efectivo');
    const [descuento, setDescuento] = useState('0');
    const [montoRecibido, setMontoRecibido] = useState('');
    const [busy, setBusy] = useState(false);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) {
            return productos.slice(0, 24);
        }
        return productos
            .filter((p) => {
                const nombre = p.nombre.toLowerCase();
                const codigo = (p.codigo ?? '').toLowerCase();
                return nombre.includes(q) || codigo.includes(q);
            })
            .slice(0, 40);
    }, [productos, query]);

    const subtotal = useMemo(
        () => round2(cart.reduce((acc, line) => acc + line.precio * line.cantidad, 0)),
        [cart],
    );
    const descuentoNum = Math.min(subtotal, Math.max(0, Number(descuento) || 0));
    const total = round2(Math.max(0, subtotal - descuentoNum));
    const montoPago =
        montoRecibido === '' ? total : Math.max(0, Number(montoRecibido) || 0);

    function addProduct(p: Producto) {
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
                    producto_id: p.id,
                    nombre: p.nombre,
                    precio: Number(p.precio),
                    cantidad: 1,
                },
            ];
        });
    }

    function setQty(productoId: string, cantidad: number) {
        setCart((prev) =>
            prev
                .map((l) =>
                    l.producto_id === productoId
                        ? { ...l, cantidad: round2(Math.max(0, cantidad)) }
                        : l,
                )
                .filter((l) => l.cantidad > 0),
        );
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
        if (tipo === 'factura') {
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
        router.post(
            ventas.store().url,
            {
                tipo_comprobante: tipo,
                cliente_nombre: clienteNombre.trim() || 'Varios',
                cliente_documento: clienteDoc.trim() || null,
                descuento: descuentoNum,
                items: cart.map((l) => ({
                    producto_id: l.producto_id,
                    cantidad: l.cantidad,
                })),
                pagos: [{ medio, monto: montoPago }],
            },
            { onFinish: () => setBusy(false) },
        );
    }

    return (
        <>
            <Head title={t('nueva.title')} />
            <div className="flex flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6">
                <PageHeader
                    title={t('nueva.title')}
                    description={
                        sede
                            ? `${t('nueva.description')} · ${t('nueva.sede_moneda', { sede: sede.nombre })}`
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
                                    {t('actions.volver')}
                                </Link>
                            </Button>
                            <Button
                                type="button"
                                variant="export"
                                size="sm"
                                className="cursor-pointer gap-1.5"
                                asChild
                            >
                                <Link
                                    href={ventas.index({
                                        vista: 'por_cobrar',
                                    }).url}
                                >
                                    <ShoppingCart
                                        className="size-4"
                                        aria-hidden
                                    />
                                    {t('actions.pendientes')}
                                </Link>
                            </Button>
                        </div>
                    }
                />

                {!sesion_abierta ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.85fr)]">
                    <div className="space-y-4">
                        <section className="space-y-3 rounded-xl border bg-card/60 p-4">
                            <div className="space-y-2">
                                <Label htmlFor="cliente">{t('nueva.cliente')}</Label>
                                <Input
                                    id="cliente"
                                    value={clienteNombre}
                                    placeholder={t('nueva.cliente_placeholder')}
                                    onChange={(e) => setClienteNombre(e.target.value)}
                                    className="h-10"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {clienteHint()}
                                </p>
                            </div>

                            {tipo !== 'ticket' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="doc">{t('nueva.documento')}</Label>
                                    <Input
                                        id="doc"
                                        value={clienteDoc}
                                        inputMode="numeric"
                                        placeholder={
                                            tipo === 'factura'
                                                ? t('nueva.documento_placeholder_factura')
                                                : t('nueva.documento_placeholder_boleta')
                                        }
                                        onChange={(e) =>
                                            setClienteDoc(
                                                e.target.value.replace(/\D/g, '').slice(0, 11),
                                            )
                                        }
                                        className="h-10"
                                    />
                                </div>
                            ) : null}

                            <div className="space-y-2">
                                <Label>{t('nueva.comprobante')}</Label>
                                <ToggleGroup
                                    type="single"
                                    value={tipo}
                                    onValueChange={(v) => {
                                        if (v) {
                                            setTipo(v);
                                        }
                                    }}
                                    variant="outline"
                                    className="grid w-full grid-cols-3 gap-1"
                                >
                                    {tipos_comprobante.map((item) => (
                                        <ToggleGroupItem
                                            key={item}
                                            value={item}
                                            className="cursor-pointer capitalize"
                                        >
                                            {t(`tipo.${item}`)}
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                                <p className="text-xs text-muted-foreground">
                                    {t('sunat.hint')}
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3 rounded-xl border bg-card/60 p-4">
                            <div className="flex items-center gap-2">
                                <Search className="size-4 text-muted-foreground" aria-hidden />
                                <h2 className="text-sm font-semibold tracking-wide uppercase">
                                    {t('nueva.buscar')}
                                </h2>
                            </div>
                            <Input
                                value={query}
                                placeholder={t('nueva.buscar_placeholder')}
                                onChange={(e) => setQuery(e.target.value)}
                                className="h-10"
                            />
                            <div className="grid max-h-[22rem] gap-2 overflow-y-auto sm:grid-cols-2">
                                {filtered.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => addProduct(p)}
                                        className="flex cursor-pointer items-start justify-between gap-2 rounded-lg border bg-background px-3 py-2.5 text-left transition-colors hover:border-brand-500/40 hover:bg-muted/40"
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-medium">
                                                {p.nombre}
                                            </span>
                                            {p.codigo ? (
                                                <span className="text-xs text-muted-foreground">
                                                    {p.codigo}
                                                </span>
                                            ) : null}
                                        </span>
                                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                                            {money(Number(p.precio))}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-3 rounded-xl border bg-card/60 p-4">
                            <div className="flex items-center gap-2">
                                <ShoppingBag
                                    className="size-4 text-muted-foreground"
                                    aria-hidden
                                />
                                <h2 className="text-sm font-semibold tracking-wide uppercase">
                                    {t('nueva.carrito')}
                                </h2>
                            </div>
                            {cart.length === 0 ? (
                                <EmptyState
                                    icon={ShoppingBag}
                                    title={t('empty.carrito')}
                                    description={t('empty.carrito_hint')}
                                />
                            ) : (
                                <ul className="divide-y rounded-lg border">
                                    {cart.map((line) => (
                                        <li
                                            key={line.producto_id}
                                            className="flex items-center gap-3 px-3 py-2.5"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {line.nombre}
                                                </p>
                                                <p className="text-xs text-muted-foreground tabular-nums">
                                                    {money(line.precio)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className="size-8 cursor-pointer"
                                                    onClick={() =>
                                                        setQty(
                                                            line.producto_id,
                                                            line.cantidad - 1,
                                                        )
                                                    }
                                                    aria-label={t('actions.quitar')}
                                                >
                                                    <Minus className="size-3.5" />
                                                </Button>
                                                <span className="w-8 text-center text-sm tabular-nums">
                                                    {line.cantidad}
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className="size-8 cursor-pointer"
                                                    onClick={() =>
                                                        setQty(
                                                            line.producto_id,
                                                            line.cantidad + 1,
                                                        )
                                                    }
                                                    aria-label={t('actions.agregar')}
                                                >
                                                    <Plus className="size-3.5" />
                                                </Button>
                                            </div>
                                            <p className="w-20 text-right text-sm font-semibold tabular-nums">
                                                {money(round2(line.precio * line.cantidad))}
                                            </p>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="size-8 cursor-pointer text-destructive"
                                                onClick={() => setQty(line.producto_id, 0)}
                                                aria-label={t('actions.quitar')}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>

                    <aside className="h-fit space-y-4 rounded-xl border bg-card/60 p-4 lg:sticky lg:top-20">
                        <div className="flex items-center gap-2">
                            <Wallet className="size-4 text-muted-foreground" aria-hidden />
                            <h2 className="text-sm font-semibold tracking-wide uppercase">
                                {t('nueva.cobro')}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {medios.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMedio(m)}
                                    className={cn(
                                        'cursor-pointer rounded-lg border px-2 py-2.5 text-center text-xs font-medium transition-colors',
                                        medio === m
                                            ? 'border-brand-600 bg-brand-600 text-white'
                                            : 'bg-background hover:bg-muted/50',
                                    )}
                                >
                                    {t(`caja:medios.${m}`)}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descuento">{t('nueva.descuento')}</Label>
                            <Input
                                id="descuento"
                                type="number"
                                min={0}
                                step="0.01"
                                value={descuento}
                                onChange={(e) => setDescuento(e.target.value)}
                                className="h-10"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="recibido">{t('nueva.monto_recibido')}</Label>
                            <Input
                                id="recibido"
                                type="number"
                                min={0}
                                step="0.01"
                                value={montoRecibido}
                                placeholder={total.toFixed(2)}
                                onChange={(e) => setMontoRecibido(e.target.value)}
                                className="h-10"
                            />
                        </div>

                        <dl className="space-y-1.5 border-t pt-3 text-sm">
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">{t('nueva.subtotal')}</dt>
                                <dd className="tabular-nums">{money(subtotal)}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted-foreground">{t('nueva.descuento')}</dt>
                                <dd className="tabular-nums">−{money(descuentoNum)}</dd>
                            </div>
                            <div className="flex justify-between gap-3 text-base font-semibold text-brand-700">
                                <dt>{t('nueva.total')}</dt>
                                <dd className="tabular-nums">{money(total)}</dd>
                            </div>
                        </dl>

                        <Button
                            type="button"
                            size="lg"
                            className="h-12 w-full cursor-pointer gap-2 text-base"
                            disabled={!canSubmit()}
                            onClick={registrar}
                        >
                            <Wallet className="size-4" aria-hidden />
                            {t('actions.registrar')} — {money(total)}
                        </Button>
                    </aside>
                </div>
            </div>
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

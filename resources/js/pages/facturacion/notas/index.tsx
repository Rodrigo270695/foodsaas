import { Head, router, usePage } from '@inertiajs/react';
import { FilePlus2, FileText, Plus, Trash2, Truck } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DataPagination,
    DataTable,
    EmptyState,
    PageHeader,
    StatBadge,
    type DataTableColumn,
} from '@/components/data-page';
import { FormField } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types';

type DocumentoRow = {
    id: string;
    tipo: number;
    tipo_label: string;
    numero: string | null;
    estado: string;
    total: number;
    afectado: string | null;
    motivo: string | null;
    emitido_at: string | null;
    error: string | null;
    pdf: string | null;
};

type CpeOption = {
    id: string;
    numero: string;
    tipo: string;
    total: number;
    receptor: string | null;
};

type Props = {
    documentos: Paginated<DocumentoRow>;
    filters: { tipo: number };
    cpes: CpeOption[];
};

type GuiaItem = { descripcion: string; cantidad: string; unidad: string };

const BASE = '/facturacion/notas';

const ESTADO_VARIANT: Record<
    string,
    'muted' | 'info' | 'warning' | 'success' | 'danger'
> = {
    pendiente: 'warning',
    emitido: 'success',
    rechazado: 'danger',
    anulado: 'muted',
};

function money(value: number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
    }).format(value);
}

export default function Index({ documentos, filters, cpes }: Props) {
    const { t } = useTranslation(['facturacion-documentos', 'common']);
    const errors = (usePage().props.errors ?? {}) as Record<string, string>;
    const [loading, setLoading] = useState(false);
    const [notaOpen, setNotaOpen] = useState(false);
    const [guiaOpen, setGuiaOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Nota
    const [afectadoId, setAfectadoId] = useState('');
    const [tipoNota, setTipoNota] = useState<'credito' | 'debito'>('credito');
    const [motivoCodigo, setMotivoCodigo] = useState('01');
    const [motivoDescripcion, setMotivoDescripcion] = useState('');
    const [monto, setMonto] = useState('');

    // Guía
    const [destinatario, setDestinatario] = useState('');
    const [partida, setPartida] = useState('');
    const [llegada, setLlegada] = useState('');
    const [transportista, setTransportista] = useState('');
    const [placa, setPlaca] = useState('');
    const [peso, setPeso] = useState('');
    const [items, setItems] = useState<GuiaItem[]>([
        { descripcion: '', cantidad: '', unidad: 'und' },
    ]);

    const tipoOptions = useMemo<readonly FilterSelectOption<string>[]>(
        () => [
            { value: '0', label: t('notas.filters.todos') },
            { value: '3', label: t('notas.filters.3') },
            { value: '4', label: t('notas.filters.4') },
            { value: '5', label: t('notas.filters.5') },
        ],
        [t],
    );

    const cpeOptions = useMemo(
        () =>
            cpes.map((c) => ({
                value: c.id,
                label: `${c.tipo} ${c.numero} · ${money(c.total)}${c.receptor ? ` · ${c.receptor}` : ''}`,
            })),
        [cpes],
    );

    const applyTipo = (tipo: string) => {
        router.get(
            BASE,
            { tipo: tipo === '0' ? undefined : tipo },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    };

    const submitNota = (event: FormEvent) => {
        event.preventDefault();
        router.post(
            `${BASE}/nota`,
            {
                documento_afectado_id: afectadoId,
                tipo: tipoNota,
                motivo_codigo: motivoCodigo,
                motivo_descripcion: motivoDescripcion,
                monto: monto || null,
            },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
                onSuccess: () => {
                    setNotaOpen(false);
                    setAfectadoId('');
                    setMotivoDescripcion('');
                    setMonto('');
                },
            },
        );
    };

    const submitGuia = (event: FormEvent) => {
        event.preventDefault();
        router.post(
            `${BASE}/guia`,
            {
                destinatario,
                direccion_partida: partida || null,
                direccion_llegada: llegada,
                transportista: transportista || null,
                placa: placa || null,
                peso_kg: peso || null,
                items,
            },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
                onSuccess: () => {
                    setGuiaOpen(false);
                    setDestinatario('');
                    setLlegada('');
                    setItems([
                        { descripcion: '', cantidad: '', unidad: 'und' },
                    ]);
                },
            },
        );
    };

    const setItem = (index: number, patch: Partial<GuiaItem>) =>
        setItems((prev) =>
            prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
        );

    const canNota =
        !saving &&
        afectadoId !== '' &&
        motivoCodigo.trim() !== '' &&
        motivoDescripcion.trim() !== '';
    const canGuia =
        !saving &&
        destinatario.trim() !== '' &&
        llegada.trim() !== '' &&
        items.every(
            (i) => i.descripcion.trim() !== '' && Number(i.cantidad) > 0,
        );

    const columns = useMemo<DataTableColumn<DocumentoRow>[]>(
        () => [
            {
                key: 'tipo',
                header: t('notas.columns.tipo'),
                cell: (row) => row.tipo_label,
            },
            {
                key: 'numero',
                header: t('notas.columns.numero'),
                cell: (row) => (
                    <span className="font-semibold tabular-nums">
                        {row.numero ?? '—'}
                    </span>
                ),
            },
            {
                key: 'afectado',
                header: t('notas.columns.afectado'),
                className: 'hidden md:table-cell',
                cell: (row) => row.afectado ?? '—',
            },
            {
                key: 'motivo',
                header: t('notas.columns.motivo'),
                className: 'hidden lg:table-cell',
                cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                        {row.motivo ?? '—'}
                    </span>
                ),
            },
            {
                key: 'total',
                header: t('notas.columns.total'),
                align: 'right',
                cell: (row) => (
                    <span className="text-sm tabular-nums">
                        {money(row.total)}
                    </span>
                ),
            },
            {
                key: 'estado',
                header: t('notas.columns.estado'),
                cell: (row) => (
                    <div className="flex flex-col gap-1">
                        <StatBadge
                            label={row.estado}
                            value=""
                            variant={ESTADO_VARIANT[row.estado] ?? 'muted'}
                        />
                        {row.error ? (
                            <span className="max-w-56 text-xs text-destructive">
                                {row.error}
                            </span>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'fecha',
                header: t('notas.columns.fecha'),
                className: 'hidden lg:table-cell',
                cell: (row) => (
                    <span className="text-sm tabular-nums">
                        {row.emitido_at
                            ? new Date(row.emitido_at).toLocaleString('es-PE')
                            : '—'}
                    </span>
                ),
            },
            {
                key: 'pdf',
                header: '',
                align: 'right',
                cell: (row) =>
                    row.pdf ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                            className="cursor-pointer"
                        >
                            <a href={row.pdf} target="_blank" rel="noreferrer">
                                {t('notas.actions.pdf')}
                            </a>
                        </Button>
                    ) : null,
            },
        ],
        [t],
    );

    return (
        <>
            <Head title={t('notas.title')} />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title={t('notas.title')}
                    description={t('notas.description')}
                    action={
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer gap-2"
                                onClick={() => setGuiaOpen(true)}
                            >
                                <Truck className="size-4" />
                                <span className="hidden sm:inline">
                                    {t('notas.actions.guia')}
                                </span>
                            </Button>
                            <Button
                                type="button"
                                className="cursor-pointer gap-2"
                                onClick={() => setNotaOpen(true)}
                            >
                                <FilePlus2 className="size-4" />
                                {t('notas.actions.nota')}
                            </Button>
                        </>
                    }
                />

                {errors.nota || errors.guia ? (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        {errors.nota ?? errors.guia}
                    </p>
                ) : null}

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <FilterSelect
                        ariaLabel={t('notas.columns.tipo')}
                        value={String(filters.tipo)}
                        onChange={applyTipo}
                        options={tipoOptions}
                        disabled={loading}
                    />
                </div>

                <DataTable
                    columns={columns}
                    data={documentos.data}
                    rowKey={(row) => row.id}
                    isLoading={loading}
                    footer={
                        <DataPagination
                            meta={documentos}
                            preservedQuery={{
                                tipo:
                                    filters.tipo > 0 ? filters.tipo : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={FileText}
                            title={t('notas.empty.title')}
                            description={t('notas.empty.description')}
                        />
                    }
                />
            </div>

            <Dialog open={notaOpen} onOpenChange={setNotaOpen}>
                <DialogContent className="sm:max-w-lg">
                    <form onSubmit={submitNota} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>{t('notas.nota.title')}</DialogTitle>
                            <DialogDescription>
                                {t('notas.nota.monto_hint')}
                            </DialogDescription>
                        </DialogHeader>
                        <FormField
                            id="nota-afectado"
                            label={t('notas.nota.afectado')}
                            required
                            error={errors.documento_afectado_id}
                        >
                            <Combobox
                                id="nota-afectado"
                                options={cpeOptions}
                                value={afectadoId || null}
                                onChange={(v) => setAfectadoId(v ?? '')}
                                placeholder={t(
                                    'notas.nota.afectado_placeholder',
                                )}
                            />
                        </FormField>
                        <FormField
                            id="nota-tipo"
                            label={t('notas.nota.tipo')}
                            error={errors.tipo}
                        >
                            <Select
                                value={tipoNota}
                                onValueChange={(v) =>
                                    setTipoNota(v as 'credito' | 'debito')
                                }
                            >
                                <SelectTrigger
                                    id="nota-tipo"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="credito">
                                        {t('notas.nota.credito')}
                                    </SelectItem>
                                    <SelectItem value="debito">
                                        {t('notas.nota.debito')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </FormField>
                        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                            <FormField
                                id="nota-codigo"
                                label={t('notas.nota.motivo_codigo')}
                                required
                                error={errors.motivo_codigo}
                            >
                                <Input
                                    id="nota-codigo"
                                    maxLength={10}
                                    value={motivoCodigo}
                                    onChange={(e) =>
                                        setMotivoCodigo(e.target.value)
                                    }
                                />
                            </FormField>
                            <FormField
                                id="nota-monto"
                                label={t('notas.nota.monto')}
                                error={errors.monto}
                            >
                                <Input
                                    id="nota-monto"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    inputMode="decimal"
                                    value={monto}
                                    onChange={(e) => setMonto(e.target.value)}
                                />
                            </FormField>
                        </div>
                        <FormField
                            id="nota-desc"
                            label={t('notas.nota.motivo_descripcion')}
                            required
                            error={errors.motivo_descripcion}
                        >
                            <Input
                                id="nota-desc"
                                maxLength={250}
                                value={motivoDescripcion}
                                onChange={(e) =>
                                    setMotivoDescripcion(e.target.value)
                                }
                            />
                        </FormField>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => setNotaOpen(false)}
                            >
                                {t('common:actions.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={!canNota}
                                className="cursor-pointer"
                            >
                                {t('notas.nota.submit')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={guiaOpen} onOpenChange={setGuiaOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <form onSubmit={submitGuia} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>{t('notas.guia.title')}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                id="guia-dest"
                                label={t('notas.guia.destinatario')}
                                required
                                error={errors.destinatario}
                                className="sm:col-span-2"
                            >
                                <Input
                                    id="guia-dest"
                                    value={destinatario}
                                    onChange={(e) =>
                                        setDestinatario(e.target.value)
                                    }
                                />
                            </FormField>
                            <FormField
                                id="guia-partida"
                                label={t('notas.guia.direccion_partida')}
                                error={errors.direccion_partida}
                            >
                                <Input
                                    id="guia-partida"
                                    value={partida}
                                    onChange={(e) => setPartida(e.target.value)}
                                />
                            </FormField>
                            <FormField
                                id="guia-llegada"
                                label={t('notas.guia.direccion_llegada')}
                                required
                                error={errors.direccion_llegada}
                            >
                                <Input
                                    id="guia-llegada"
                                    value={llegada}
                                    onChange={(e) => setLlegada(e.target.value)}
                                />
                            </FormField>
                            <FormField
                                id="guia-transp"
                                label={t('notas.guia.transportista')}
                                error={errors.transportista}
                            >
                                <Input
                                    id="guia-transp"
                                    value={transportista}
                                    onChange={(e) =>
                                        setTransportista(e.target.value)
                                    }
                                />
                            </FormField>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    id="guia-placa"
                                    label={t('notas.guia.placa')}
                                    error={errors.placa}
                                >
                                    <Input
                                        id="guia-placa"
                                        maxLength={20}
                                        value={placa}
                                        onChange={(e) =>
                                            setPlaca(e.target.value)
                                        }
                                    />
                                </FormField>
                                <FormField
                                    id="guia-peso"
                                    label={t('notas.guia.peso')}
                                    error={errors.peso_kg}
                                >
                                    <Input
                                        id="guia-peso"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={peso}
                                        onChange={(e) =>
                                            setPeso(e.target.value)
                                        }
                                    />
                                </FormField>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">
                                    {t('notas.guia.items')}
                                </h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer gap-1.5"
                                    onClick={() =>
                                        setItems((prev) => [
                                            ...prev,
                                            {
                                                descripcion: '',
                                                cantidad: '',
                                                unidad: 'und',
                                            },
                                        ])
                                    }
                                >
                                    <Plus className="size-3.5" />
                                    {t('notas.guia.add_item')}
                                </Button>
                            </div>
                            {typeof errors.items === 'string' ? (
                                <p className="text-xs text-destructive">
                                    {errors.items}
                                </p>
                            ) : null}
                            {items.map((item, index) => (
                                <div
                                    key={`item-${index}`}
                                    className="grid grid-cols-[1fr_5rem_4.5rem_2.25rem] gap-2"
                                >
                                    <Input
                                        aria-label={t('notas.guia.descripcion')}
                                        placeholder={t(
                                            'notas.guia.descripcion',
                                        )}
                                        value={item.descripcion}
                                        onChange={(e) =>
                                            setItem(index, {
                                                descripcion: e.target.value,
                                            })
                                        }
                                    />
                                    <Input
                                        type="number"
                                        min={0.001}
                                        step="0.001"
                                        aria-label={t('notas.guia.cantidad')}
                                        placeholder={t('notas.guia.cantidad')}
                                        value={item.cantidad}
                                        onChange={(e) =>
                                            setItem(index, {
                                                cantidad: e.target.value,
                                            })
                                        }
                                        className="text-right tabular-nums"
                                    />
                                    <Input
                                        aria-label={t('notas.guia.unidad')}
                                        placeholder={t('notas.guia.unidad')}
                                        maxLength={20}
                                        value={item.unidad}
                                        onChange={(e) =>
                                            setItem(index, {
                                                unidad: e.target.value,
                                            })
                                        }
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-9 cursor-pointer text-destructive"
                                        disabled={items.length <= 1}
                                        aria-label={t('common:actions.remove')}
                                        onClick={() =>
                                            setItems((prev) =>
                                                prev.filter(
                                                    (_, i) => i !== index,
                                                ),
                                            )
                                        }
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => setGuiaOpen(false)}
                            >
                                {t('common:actions.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={!canGuia}
                                className="cursor-pointer"
                            >
                                {t('notas.guia.submit')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Facturación' },
            { title: 'Notas y guías', href: '/facturacion/notas' },
        ]}
    >
        {page}
    </AppLayout>
);

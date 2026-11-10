import { router, useForm } from '@inertiajs/react';
import { Loader2, Plus, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
    FilterSelect,
    type FilterSelectOption,
} from '@/components/ui/filter-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { usePermission } from '@/hooks/use-permission';
import { cn } from '@/lib/utils';
import {
    ClienteFormModal,
    type ClienteQuickCreated,
} from '@/pages/clientes/components/cliente-form-modal';

export type MesaOption = {
    id: string;
    codigo: string;
    nombre: string | null;
    capacidad: number;
};

export type ReservaClienteOption = {
    id: string;
    nombre: string;
    documento_tipo: string | null;
    documento: string | null;
    telefono: string | null;
};

export type ReservaFormRow = {
    id: string;
    cliente_nombre: string;
    cliente_telefono: string | null;
    personas: number;
    reserved_at: string | null;
    estado: string;
    notas: string | null;
    mesa: { id: string; codigo: string; nombre: string | null } | null;
};

type ReservaFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reserva: ReservaFormRow | null;
    mesas: MesaOption[];
    clientes: ReservaClienteOption[];
    defaultDate: string;
};

type FormData = {
    mesa_id: string;
    cliente_nombre: string;
    cliente_telefono: string;
    personas: number;
    reserved_at: string;
    notas: string;
};

function toLocalInput(iso: string | null | undefined, fallbackDate: string): string {
    if (!iso) {
        return `${fallbackDate}T19:00`;
    }
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

function matchClienteId(
    list: readonly ReservaClienteOption[],
    nombre: string,
    telefono: string | null | undefined,
): string | null {
    const n = nombre.trim().toLowerCase();
    if (!n) {
        return null;
    }
    const tel = (telefono ?? '').trim();
    const exact = list.find(
        (c) =>
            c.nombre.trim().toLowerCase() === n &&
            (tel === '' || (c.telefono ?? '').trim() === tel),
    );
    return exact?.id ?? list.find((c) => c.nombre.trim().toLowerCase() === n)?.id ?? null;
}

export function ReservaFormModal({
    open,
    onOpenChange,
    reserva,
    mesas,
    clientes = [],
    defaultDate,
}: ReservaFormModalProps) {
    const { t } = useTranslation(['reservas', 'common', 'clientes']);
    const canCreateCliente = usePermission('clientes.create');
    const isEdit = reserva !== null;
    const [clienteId, setClienteId] = useState<string | null>(null);
    const [clienteQuickOpen, setClienteQuickOpen] = useState(false);
    const [clienteDraftNombre, setClienteDraftNombre] = useState('');

    const { data, setData, post, put, processing, errors, reset, clearErrors, transform } =
        useForm<FormData>({
            mesa_id: '',
            cliente_nombre: '',
            cliente_telefono: '',
            personas: 2,
            reserved_at: `${defaultDate}T19:00`,
            notas: '',
        });

    useEffect(() => {
        if (!open) {
            setClienteQuickOpen(false);
            return;
        }
        clearErrors();
        const nombre = reserva?.cliente_nombre ?? '';
        const telefono = reserva?.cliente_telefono ?? '';
        setData({
            mesa_id: reserva?.mesa?.id ?? '',
            cliente_nombre: nombre,
            cliente_telefono: telefono,
            personas: reserva?.personas ?? 2,
            reserved_at: toLocalInput(reserva?.reserved_at, defaultDate),
            notas: reserva?.notas ?? '',
        });
        setClienteId(matchClienteId(clientes, nombre, telefono));
        setClienteDraftNombre('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, reserva?.id, defaultDate]);

    useEffect(() => {
        if (!open || !data.cliente_nombre.trim()) {
            return;
        }
        const matched = matchClienteId(
            clientes,
            data.cliente_nombre,
            data.cliente_telefono,
        );
        if (matched && matched !== clienteId) {
            setClienteId(matched);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientes, open]);

    const clienteOptions = useMemo<ComboboxOption[]>(
        () =>
            clientes.map((c) => {
                const doc = [c.documento_tipo, c.documento]
                    .filter(Boolean)
                    .join(' ')
                    .trim();
                const label = doc ? `${c.nombre} · ${doc}` : c.nombre;

                return {
                    value: c.id,
                    label,
                    keywords: [c.nombre, c.documento ?? '', c.telefono ?? '', doc]
                        .filter(Boolean)
                        .join(' '),
                };
            }),
        [clientes],
    );

    const mesaOptions = useMemo<FilterSelectOption[]>(
        () => [
            {
                value: '__none__',
                label: t('reservas:sin_mesa'),
            },
            ...mesas.map((mesa) => ({
                value: mesa.id,
                label: `${mesa.nombre || mesa.codigo} · ${mesa.capacidad}p`,
            })),
        ],
        [mesas, t],
    );

    const canSubmit = useMemo(() => {
        if (processing || clienteQuickOpen) {
            return false;
        }
        if (data.cliente_nombre.trim().length < 2) {
            return false;
        }
        if (!data.reserved_at) {
            return false;
        }
        if (data.personas < 1 || data.personas > 99) {
            return false;
        }
        return true;
    }, [processing, clienteQuickOpen, data]);

    const openClienteQuick = (nombreHint = '') => {
        setClienteDraftNombre(nombreHint.trim());
        setClienteQuickOpen(true);
    };

    const handleClienteCreated = (created: ClienteQuickCreated) => {
        setData((prev) => ({
            ...prev,
            cliente_nombre: created.nombre,
            cliente_telefono: created.telefono || prev.cliente_telefono,
        }));
        router.reload({
            only: ['clientes'],
            preserveScroll: true,
            onSuccess: (page) => {
                const next = (page.props.clientes ?? []) as ReservaClienteOption[];
                const id = matchClienteId(next, created.nombre, created.telefono);
                if (id) {
                    setClienteId(id);
                }
            },
        });
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }
        transform((current) => ({
            ...current,
            mesa_id: current.mesa_id || null,
        }));
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setClienteId(null);
                onOpenChange(false);
            },
        };
        if (isEdit && reserva) {
            put(`/reservas/${reserva.id}`, opts);
            return;
        }
        post('/reservas', opts);
    };

    const paired = open && clienteQuickOpen;

    return (
        <>
            <FormModal
                open={open}
                onOpenChange={(next) => {
                    if (!next) {
                        setClienteQuickOpen(false);
                    }
                    onOpenChange(next);
                }}
                title={
                    isEdit
                        ? t('reservas:form.edit')
                        : t('reservas:form.create')
                }
                description={t('reservas:form.description')}
                onSubmit={onSubmit}
                blockEscape={clienteQuickOpen}
                className={cn(
                    'transition-[left,transform,opacity,width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                    paired &&
                        'max-md:pointer-events-none max-md:opacity-40 md:left-[calc(50%-min(28vw,17.5rem))] md:sm:max-w-md',
                )}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={processing || clienteQuickOpen}
                            onClick={() => onOpenChange(false)}
                            className="cursor-pointer"
                        >
                            {t('common:actions.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={!canSubmit}
                            className="cursor-pointer gap-2 disabled:cursor-not-allowed"
                        >
                            {processing ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : null}
                            {isEdit
                                ? t('reservas:form.submit_edit')
                                : t('reservas:form.submit_create')}
                        </Button>
                    </>
                }
            >
                <FormSection index={0} title={t('reservas:form.section')} columns={2}>
                    <FormField
                        id="reserva-cliente"
                        label={t('reservas:form.cliente_nombre')}
                        error={errors.cliente_nombre}
                        required
                        className="sm:col-span-2"
                        hint={t('reservas:form.cliente_hint')}
                    >
                        <div className="flex flex-col gap-2">
                            <Combobox
                                id="reserva-cliente"
                                options={clienteOptions}
                                value={clienteId}
                                onChange={(id) => {
                                    setClienteId(id);
                                    if (!id) {
                                        setData((prev) => ({
                                            ...prev,
                                            cliente_nombre: '',
                                            cliente_telefono: '',
                                        }));
                                        return;
                                    }
                                    const selected = clientes.find((c) => c.id === id);
                                    if (!selected) {
                                        return;
                                    }
                                    setData((prev) => ({
                                        ...prev,
                                        cliente_nombre: selected.nombre,
                                        cliente_telefono: selected.telefono ?? '',
                                    }));
                                }}
                                placeholder={t('reservas:form.cliente_placeholder')}
                                searchPlaceholder={t(
                                    'reservas:form.cliente_search_placeholder',
                                )}
                                emptyMessage={t('reservas:form.cliente_empty')}
                                onCreateOption={
                                    canCreateCliente
                                        ? (query) => openClienteQuick(query)
                                        : undefined
                                }
                                createOptionLabel={(q) =>
                                    t('reservas:form.cliente_create_option', {
                                        name: q,
                                    })
                                }
                                aria-invalid={Boolean(errors.cliente_nombre)}
                                disabled={processing || clienteQuickOpen}
                            />
                            {canCreateCliente ? (
                                <button
                                    type="button"
                                    className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                    onClick={() =>
                                        openClienteQuick(data.cliente_nombre)
                                    }
                                    disabled={processing || clienteQuickOpen}
                                >
                                    <Plus className="size-3.5" aria-hidden />
                                    {t('reservas:form.cliente_create_link')}
                                </button>
                            ) : null}
                        </div>
                    </FormField>

                    <FormField
                        id="reserva-telefono"
                        label={t('reservas:form.cliente_telefono')}
                        error={errors.cliente_telefono}
                    >
                        <Input
                            id="reserva-telefono"
                            value={data.cliente_telefono}
                            onChange={(e) =>
                                setData('cliente_telefono', e.target.value)
                            }
                            placeholder={t('reservas:form.telefono_placeholder')}
                            disabled={processing || clienteQuickOpen}
                        />
                    </FormField>

                    <FormField
                        id="reserva-personas"
                        label={t('reservas:form.personas')}
                        error={errors.personas}
                        required
                    >
                        <Input
                            id="reserva-personas"
                            type="number"
                            min={1}
                            max={99}
                            value={data.personas}
                            onChange={(e) =>
                                setData('personas', Number(e.target.value) || 1)
                            }
                            disabled={processing || clienteQuickOpen}
                        />
                    </FormField>

                    <FormField
                        id="reserva-fecha"
                        label={t('reservas:form.reserved_at')}
                        error={errors.reserved_at}
                        required
                    >
                        <Input
                            id="reserva-fecha"
                            type="datetime-local"
                            value={data.reserved_at}
                            onChange={(e) =>
                                setData('reserved_at', e.target.value)
                            }
                            disabled={processing || clienteQuickOpen}
                        />
                    </FormField>

                    <FormField
                        id="reserva-mesa"
                        label={t('reservas:form.mesa')}
                        error={errors.mesa_id}
                    >
                        <FilterSelect
                            ariaLabel={t('reservas:form.mesa')}
                            value={data.mesa_id || '__none__'}
                            onChange={(value) =>
                                setData(
                                    'mesa_id',
                                    value === '__none__' ? '' : value,
                                )
                            }
                            options={mesaOptions}
                            disabled={processing || clienteQuickOpen}
                            className="w-full min-w-0 sm:w-full"
                        />
                    </FormField>

                    <FormField
                        id="reserva-notas"
                        label={t('reservas:form.notas')}
                        error={errors.notas}
                        className="sm:col-span-2"
                    >
                        <Textarea
                            id="reserva-notas"
                            value={data.notas}
                            onChange={(e) => setData('notas', e.target.value)}
                            rows={3}
                            disabled={processing || clienteQuickOpen}
                        />
                    </FormField>
                </FormSection>
            </FormModal>

            <ClienteFormModal
                open={clienteQuickOpen}
                onOpenChange={setClienteQuickOpen}
                cliente={null}
                initialDraft={{ nombre: clienteDraftNombre }}
                onCreated={handleClienteCreated}
                showOverlay={false}
                className={cn(
                    'z-[60] transition-[left,transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                    // Móvil: modal completo centrado encima
                    'max-md:left-1/2 max-md:translate-x-[-50%]',
                    // Desktop: panel a la derecha, con gutter ~1.5–2rem entre ambos
                    'md:left-[calc(50%+min(28vw,17.5rem))] md:sm:max-w-md',
                )}
            />

            {paired ? (
                <div
                    className="pointer-events-none fixed inset-x-0 top-3 z-[55] flex justify-center px-4 md:hidden"
                    aria-hidden
                >
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
                        <UserRound className="size-3.5 text-primary" />
                        {t('reservas:form.cliente_quick_badge')}
                    </div>
                </div>
            ) : null}
        </>
    );
}

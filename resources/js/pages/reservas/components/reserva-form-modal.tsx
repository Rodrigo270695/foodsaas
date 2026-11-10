import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type MesaOption = {
    id: string;
    codigo: string;
    nombre: string | null;
    capacidad: number;
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
    estados: string[];
    defaultDate: string;
};

type FormData = {
    mesa_id: string;
    cliente_nombre: string;
    cliente_telefono: string;
    personas: number;
    reserved_at: string;
    estado: string;
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

export function ReservaFormModal({
    open,
    onOpenChange,
    reserva,
    mesas,
    estados,
    defaultDate,
}: ReservaFormModalProps) {
    const { t } = useTranslation(['reservas', 'common']);
    const isEdit = reserva !== null;
    const { data, setData, post, put, processing, errors, reset, clearErrors, transform } =
        useForm<FormData>({
            mesa_id: '',
            cliente_nombre: '',
            cliente_telefono: '',
            personas: 2,
            reserved_at: `${defaultDate}T19:00`,
            estado: 'pendiente',
            notas: '',
        });

    useEffect(() => {
        if (!open) {
            return;
        }
        clearErrors();
        setData({
            mesa_id: reserva?.mesa?.id ?? '',
            cliente_nombre: reserva?.cliente_nombre ?? '',
            cliente_telefono: reserva?.cliente_telefono ?? '',
            personas: reserva?.personas ?? 2,
            reserved_at: toLocalInput(reserva?.reserved_at, defaultDate),
            estado: reserva?.estado ?? 'pendiente',
            notas: reserva?.notas ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, reserva?.id, defaultDate]);

    const canSubmit = useMemo(() => {
        if (processing) {
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
        if (isEdit && !data.estado) {
            return false;
        }
        return true;
    }, [processing, data, isEdit]);

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
                onOpenChange(false);
            },
        };
        if (isEdit && reserva) {
            put(`/reservas/${reserva.id}`, opts);
            return;
        }
        post('/reservas', opts);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={
                isEdit
                    ? t('reservas:form.edit')
                    : t('reservas:form.create')
            }
            description={t('reservas:form.description')}
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={processing}
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
            <FormSection index={0} title={t('reservas:form.section')}>
                <FormField
                    id="reserva-cliente"
                    label={t('reservas:form.cliente_nombre')}
                    error={errors.cliente_nombre}
                    required
                >
                    <Input
                        id="reserva-cliente"
                        value={data.cliente_nombre}
                        onChange={(e) =>
                            setData('cliente_nombre', e.target.value)
                        }
                        autoFocus
                    />
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
                    />
                </FormField>
                <FormField
                    id="reserva-mesa"
                    label={t('reservas:form.mesa')}
                    error={errors.mesa_id}
                >
                    <Select
                        value={data.mesa_id || '__none__'}
                        onValueChange={(value) =>
                            setData(
                                'mesa_id',
                                value === '__none__' ? '' : value,
                            )
                        }
                    >
                        <SelectTrigger id="reserva-mesa">
                            <SelectValue
                                placeholder={t('reservas:sin_mesa')}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">
                                {t('reservas:sin_mesa')}
                            </SelectItem>
                            {mesas.map((mesa) => (
                                <SelectItem key={mesa.id} value={mesa.id}>
                                    {mesa.nombre || mesa.codigo} (
                                    {mesa.capacidad})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                {isEdit ? (
                    <FormField
                        id="reserva-estado"
                        label={t('reservas:form.estado')}
                        error={errors.estado}
                        required
                    >
                        <Select
                            value={data.estado}
                            onValueChange={(value) =>
                                setData('estado', value)
                            }
                        >
                            <SelectTrigger id="reserva-estado">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {estados.map((estado) => (
                                    <SelectItem key={estado} value={estado}>
                                        {t(`reservas:estados.${estado}`, {
                                            defaultValue: estado,
                                        })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                ) : null}
                <FormField
                    id="reserva-notas"
                    label={t('reservas:form.notas')}
                    error={errors.notas}
                >
                    <Textarea
                        id="reserva-notas"
                        value={data.notas}
                        onChange={(e) => setData('notas', e.target.value)}
                        rows={3}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}

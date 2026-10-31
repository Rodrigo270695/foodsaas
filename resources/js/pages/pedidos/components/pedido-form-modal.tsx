import { useForm } from '@inertiajs/react';
import { Loader2, Store } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import pedidos from '../pedidos-routes';

export type MesaLibreOption = {
    id: string;
    codigo: string;
    nombre: string | null;
    capacidad: number;
};

type PedidoFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mesasLibres: readonly MesaLibreOption[];
};

type FormData = {
    canal: 'salon' | 'mostrador' | 'delivery';
    mesa_id: string;
    comensales: number;
    notas: string;
};

export function PedidoFormModal({
    open,
    onOpenChange,
    mesasLibres,
}: PedidoFormModalProps) {
    const { t } = useTranslation(['pedidos', 'common']);
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            canal: 'mostrador',
            mesa_id: '',
            comensales: 1,
            notas: '',
        });

    useEffect(() => {
        if (!open) {
            return;
        }
        clearErrors();
        reset();
        setData({
            // Desde Pedidos el caso típico es mostrador; salón se abre desde el piso.
            canal: 'mostrador',
            mesa_id: '',
            comensales: 1,
            notas: '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (data.canal !== 'salon' || data.mesa_id === '') {
            return;
        }
        const mesa = mesasLibres.find((m) => m.id === data.mesa_id);
        if (mesa && data.comensales === 1) {
            setData('comensales', Math.max(1, mesa.capacidad || 1));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.mesa_id]);

    const canSubmit = useMemo(() => {
        if (processing) {
            return false;
        }
        if (data.canal === 'salon' && data.mesa_id === '') {
            return false;
        }
        return data.comensales >= 1 && data.comensales <= 99;
    }, [processing, data.canal, data.mesa_id, data.comensales]);

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }

        post(pedidos.store().url, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={t('actions.new')}
            description={t('form.modal_description', {
                defaultValue:
                    'Mostrador o delivery desde aquí. Pedidos de mesa: tócala en Salón → Operar.',
            })}
            size="sm"
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
                        className="cursor-pointer gap-2"
                    >
                        {processing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        {t('actions.open')}
                    </Button>
                </>
            }
        >
            <FormSection
                index={0}
                title={t('form.section_pedido', {
                    defaultValue: 'Datos del pedido',
                })}
            >
                <FormField
                    label={t('columns.canal')}
                    htmlFor="pedido-canal"
                    error={errors.canal}
                    required
                >
                    <Select
                        value={data.canal}
                        onValueChange={(v) => {
                            const canal = v as FormData['canal'];
                            setData((prev) => ({
                                ...prev,
                                canal,
                                mesa_id: canal === 'salon' ? prev.mesa_id : '',
                            }));
                        }}
                    >
                        <SelectTrigger id="pedido-canal" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mostrador">
                                <span className="inline-flex items-center gap-2">
                                    <Store className="size-3.5" />
                                    {t('canal.mostrador')}
                                </span>
                            </SelectItem>
                            <SelectItem value="salon">
                                {t('canal.salon')}
                            </SelectItem>
                            <SelectItem value="delivery">
                                {t('canal.delivery')}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>

                {data.canal === 'salon' ? (
                    <FormField
                        label={t('form.mesa')}
                        htmlFor="pedido-mesa"
                        error={errors.mesa_id}
                        required
                        hint={
                            mesasLibres.length === 0
                                ? t('form.no_mesas_libres', {
                                      defaultValue:
                                          'No hay mesas libres. Libera una o abre desde Salón.',
                                  })
                                : t('form.mesa_hint', {
                                      defaultValue:
                                          'Solo mesas sin pedido activo.',
                                  })
                        }
                    >
                        <Select
                            value={data.mesa_id || undefined}
                            onValueChange={(v) => setData('mesa_id', v)}
                        >
                            <SelectTrigger id="pedido-mesa" className="w-full">
                                <SelectValue
                                    placeholder={t('form.mesa')}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {mesasLibres.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.nombre?.trim() || m.codigo}
                                        {' · '}
                                        {t('form.comensales_cap', {
                                            count: m.capacidad,
                                            defaultValue: `${m.capacidad} pers.`,
                                        })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                ) : null}

                <FormField
                    label={t('form.comensales')}
                    htmlFor="pedido-comensales"
                    error={errors.comensales}
                    required
                >
                    <Input
                        id="pedido-comensales"
                        type="number"
                        min={1}
                        max={99}
                        value={data.comensales}
                        onChange={(e) =>
                            setData(
                                'comensales',
                                Math.max(1, Number(e.target.value) || 1),
                            )
                        }
                    />
                </FormField>

                <FormField
                    label={t('form.notas')}
                    htmlFor="pedido-notas"
                    error={errors.notas}
                >
                    <Input
                        id="pedido-notas"
                        value={data.notas}
                        maxLength={500}
                        placeholder={t('form.notas_placeholder', {
                            defaultValue: 'Opcional',
                        })}
                        onChange={(e) => setData('notas', e.target.value)}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}

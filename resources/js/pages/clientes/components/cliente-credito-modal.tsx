import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import clientes from '../clientes-routes';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cliente: { id: string; nombre: string; saldo_credito: number } | null;
};

export function ClienteCreditoModal({ open, onOpenChange, cliente }: Props) {
    const { t } = useTranslation(['clientes', 'common']);
    const form = useForm({ monto: '', motivo: '' });

    useEffect(() => {
        if (!open) {
            return;
        }
        form.reset();
        form.clearErrors();
        form.setData({ monto: '', motivo: '' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, cliente?.id]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!cliente) {
            return;
        }
        form.transform((data) => ({
            ...data,
            monto: Number(data.monto || 0),
            motivo: data.motivo.trim() || null,
        }));
        form.post(clientes.credito(cliente.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={t('clientes:credito.title')}
            description={
                cliente
                    ? t('clientes:credito.description', {
                          name: cliente.nombre,
                          saldo: Number(cliente.saldo_credito).toFixed(2),
                      })
                    : undefined
            }
            onSubmit={onSubmit}
            footer={
                <Button
                    type="submit"
                    disabled={form.processing || !cliente}
                    className="cursor-pointer gap-2"
                >
                    {form.processing ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {t('clientes:credito.submit')}
                </Button>
            }
        >
            <div className="grid gap-3">
                <FormField
                    label={t('clientes:credito.monto')}
                    error={form.errors.monto}
                >
                    <Input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={form.data.monto}
                        onChange={(e) => form.setData('monto', e.target.value)}
                        autoFocus
                    />
                </FormField>
                <FormField label={t('clientes:credito.motivo')}>
                    <Input
                        value={form.data.motivo}
                        onChange={(e) =>
                            form.setData('motivo', e.target.value)
                        }
                        maxLength={255}
                    />
                </FormField>
            </div>
        </FormModal>
    );
}

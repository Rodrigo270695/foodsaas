import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function DeliveryZonaModal({ open, onOpenChange }: Props) {
    const { t } = useTranslation(['delivery', 'common']);
    const form = useForm({
        nombre: '',
        tarifa: '',
        activa: true,
    });

    useEffect(() => {
        if (!open) {
            return;
        }
        form.reset();
        form.clearErrors();
        form.setData({ nombre: '', tarifa: '', activa: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            tarifa: Number(data.tarifa || 0),
        }));
        form.post('/delivery/zonas', {
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
            title={t('delivery:zonas.create')}
            onSubmit={onSubmit}
            footer={
                <Button
                    type="submit"
                    disabled={form.processing || !form.data.nombre.trim()}
                    className="cursor-pointer gap-2"
                >
                    {form.processing ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {t('common:actions.save')}
                </Button>
            }
        >
            <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                    label={t('delivery:zonas.nombre')}
                    error={form.errors.nombre}
                    className="sm:col-span-2"
                >
                    <Input
                        value={form.data.nombre}
                        onChange={(e) =>
                            form.setData('nombre', e.target.value)
                        }
                        autoFocus
                    />
                </FormField>
                <FormField
                    label={t('delivery:zonas.tarifa')}
                    error={form.errors.tarifa}
                >
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.data.tarifa}
                        onChange={(e) =>
                            form.setData('tarifa', e.target.value)
                        }
                    />
                </FormField>
            </div>
        </FormModal>
    );
}

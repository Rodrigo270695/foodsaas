import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

type FormData = {
    nombre: string;
    tarifa: string;
    activa: boolean;
};

const emptyForm = (): FormData => ({
    nombre: '',
    tarifa: '',
    activa: true,
});

const isFormValid = (data: FormData): boolean => {
    if (data.nombre.trim().length < 2) {
        return false;
    }
    if (data.tarifa.trim() === '') {
        return false;
    }
    const tarifa = Number(data.tarifa);
    return Number.isFinite(tarifa) && tarifa >= 0;
};

export function DeliveryZonaModal({ open, onOpenChange }: Props) {
    const { t } = useTranslation(['delivery', 'common']);
    const { data, setData, post, processing, errors, reset, clearErrors, transform } =
        useForm<FormData>(emptyForm());

    const initialSnapshotRef = useRef<FormData>(emptyForm());
    const canSubmit = isFormValid(data) && !processing;

    useEffect(() => {
        if (!open) {
            return;
        }
        const initial = emptyForm();
        initialSnapshotRef.current = initial;
        setData(initial);
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const isDirty = useMemo(() => {
        const initial = initialSnapshotRef.current;
        return (
            initial.nombre !== data.nombre ||
            initial.tarifa !== data.tarifa ||
            initial.activa !== data.activa
        );
    }, [data]);

    const handleClose = (next: boolean) => {
        if (!next) {
            if (isDirty && !window.confirm(t('common:form.unsaved_changes'))) {
                return;
            }
            reset();
            clearErrors();
        }
        onOpenChange(next);
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }
        transform((payload) => ({
            ...payload,
            tarifa: Number(payload.tarifa || 0),
        }));
        post('/delivery/zonas', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                clearErrors();
                onOpenChange(false);
            },
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={handleClose}
            title={t('delivery:zonas.create')}
            description={t('delivery:zonas.description')}
            size="md"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleClose(false)}
                        disabled={processing}
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
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                            />
                        ) : null}
                        {t('common:actions.save')}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormSection
                    index={0}
                    title={t('delivery:zonas.section_basic')}
                    description={t('delivery:zonas.section_basic_hint')}
                    columns={2}
                >
                    <FormField
                        id="delivery-zona-nombre"
                        label={t('delivery:zonas.nombre')}
                        error={errors.nombre}
                        required
                        className="sm:col-span-2"
                    >
                        <Input
                            id="delivery-zona-nombre"
                            value={data.nombre}
                            onChange={(e) => setData('nombre', e.target.value)}
                            placeholder={t('delivery:zonas.nombre_placeholder')}
                            maxLength={120}
                            autoFocus
                            className="h-9"
                        />
                    </FormField>
                    <FormField
                        id="delivery-zona-tarifa"
                        label={t('delivery:zonas.tarifa')}
                        error={errors.tarifa}
                        hint={t('delivery:zonas.tarifa_hint')}
                        required
                    >
                        <Input
                            id="delivery-zona-tarifa"
                            type="number"
                            min={0}
                            step="0.01"
                            value={data.tarifa}
                            onChange={(e) => setData('tarifa', e.target.value)}
                            placeholder="0.00"
                            className="h-9"
                        />
                    </FormField>
                </FormSection>

                <FormSection index={1} title={t('delivery:zonas.section_status')}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:bg-muted/30">
                        <Checkbox
                            id="delivery-zona-activa"
                            checked={data.activa}
                            onCheckedChange={(checked) =>
                                setData('activa', checked === true)
                            }
                            className="mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">
                                {t('delivery:zonas.activa')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {t('delivery:zonas.activa_hint')}
                            </span>
                        </div>
                    </label>
                    {errors.activa ? (
                        <p className="text-xs text-destructive">
                            {errors.activa}
                        </p>
                    ) : null}
                </FormSection>
            </div>
        </FormModal>
    );
}

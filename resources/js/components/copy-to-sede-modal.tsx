import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal } from '@/components/forms';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ActiveSedeOption } from '@/components/active-sede-switcher';

type CopyToSedeModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targets: ActiveSedeOption[];
    actionUrl: string;
    title: string;
    description: string;
};

export function CopyToSedeModal({
    open,
    onOpenChange,
    targets,
    actionUrl,
    title,
    description,
}: CopyToSedeModalProps) {
    const { t } = useTranslation('common');
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({ target_sede_id: '' });

    useEffect(() => {
        if (open) {
            reset();
            clearErrors();
            setData('target_sede_id', targets[0]?.id ?? '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, targets]);

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(actionUrl, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                        className="cursor-pointer"
                    >
                        {t('actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={
                            processing ||
                            !data.target_sede_id ||
                            targets.length === 0
                        }
                        className="cursor-pointer gap-2"
                    >
                        {processing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        {t('sede_switcher.copy_confirm', {
                            defaultValue: 'Copiar',
                        })}
                    </Button>
                </>
            }
        >
            <FormField
                id="copy-target-sede"
                label={t('sede_switcher.target', {
                    defaultValue: 'Sede destino',
                })}
                required
                error={errors.target_sede_id}
            >
                <Select
                    value={data.target_sede_id || undefined}
                    onValueChange={(v) => setData('target_sede_id', v)}
                    disabled={targets.length === 0}
                >
                    <SelectTrigger id="copy-target-sede" className="w-full">
                        <SelectValue
                            placeholder={t('sede_switcher.target_placeholder', {
                                defaultValue: 'Elige sede',
                            })}
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {targets.map((sede) => (
                            <SelectItem key={sede.id} value={sede.id}>
                                {sede.nombre} ({sede.codigo})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>
            {targets.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                    {t('sede_switcher.no_targets', {
                        defaultValue:
                            'No hay otra sede disponible para copiar.',
                    })}
                </p>
            ) : null}
        </FormModal>
    );
}

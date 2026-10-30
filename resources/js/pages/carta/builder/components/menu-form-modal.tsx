import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import carta from '../../carta-routes';

type MenuFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function MenuFormModal({ open, onOpenChange }: MenuFormModalProps) {
    const { t } = useTranslation(['carta', 'common']);
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            nombre: '',
            descripcion: '',
            fondo_preset: 'cream',
            paginas: 1,
            publicada: false,
        });

    useEffect(() => {
        if (open) {
            reset();
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        post(carta.menus.store().url, {
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
            title={t('builder.create_title')}
            description={t('builder.create_description')}
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common:actions.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={processing || !data.nombre.trim()}
                        className="cursor-pointer gap-2"
                    >
                        {processing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        {t('builder.create_submit')}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <FormField
                    id="menu-nombre"
                    label={t('builder.fields.nombre')}
                    required
                    error={errors.nombre}
                >
                    <Input
                        id="menu-nombre"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        placeholder={t('builder.fields.nombre_placeholder')}
                        autoFocus
                    />
                </FormField>
                <FormField
                    id="menu-descripcion"
                    label={t('builder.fields.descripcion')}
                    error={errors.descripcion}
                >
                    <Textarea
                        id="menu-descripcion"
                        value={data.descripcion}
                        onChange={(e) => setData('descripcion', e.target.value)}
                        rows={2}
                        placeholder={t('builder.fields.descripcion_placeholder')}
                    />
                </FormField>
                <FormField
                    id="menu-paginas"
                    label={t('builder.fields.paginas')}
                    hint={t('builder.fields.paginas_hint')}
                    error={errors.paginas}
                >
                    <Input
                        id="menu-paginas"
                        type="number"
                        min={1}
                        max={8}
                        value={data.paginas}
                        onChange={(e) =>
                            setData(
                                'paginas',
                                Number.parseInt(e.target.value, 10) || 1,
                            )
                        }
                    />
                </FormField>
            </div>
        </FormModal>
    );
}

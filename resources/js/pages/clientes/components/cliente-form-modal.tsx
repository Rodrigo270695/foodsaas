import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export type ClienteFormRow = {
    id: string;
    nombre: string;
    documento: string | null;
    telefono: string | null;
    email: string | null;
    notas: string | null;
};

type ClienteFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cliente: ClienteFormRow | null;
};

type FormData = {
    nombre: string;
    documento: string;
    telefono: string;
    email: string;
    notas: string;
};

export function ClienteFormModal({
    open,
    onOpenChange,
    cliente,
}: ClienteFormModalProps) {
    const { t } = useTranslation(['clientes', 'common']);
    const isEdit = cliente !== null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            nombre: '',
            documento: '',
            telefono: '',
            email: '',
            notas: '',
        });

    useEffect(() => {
        if (!open) {
            return;
        }
        clearErrors();
        setData({
            nombre: cliente?.nombre ?? '',
            documento: cliente?.documento ?? '',
            telefono: cliente?.telefono ?? '',
            email: cliente?.email ?? '',
            notas: cliente?.notas ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, cliente?.id]);

    const canSubmit = useMemo(() => {
        if (processing) {
            return false;
        }
        return data.nombre.trim().length >= 2;
    }, [processing, data.nombre]);

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        };
        if (isEdit && cliente) {
            put(`/clientes/${cliente.id}`, opts);
            return;
        }
        post('/clientes', opts);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={
                isEdit
                    ? t('clientes:form.edit')
                    : t('clientes:form.create')
            }
            description={t('clientes:form.description')}
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
                            ? t('clientes:form.submit_edit')
                            : t('clientes:form.submit_create')}
                    </Button>
                </>
            }
        >
            <FormSection index={0} title={t('clientes:form.section')}>
                <FormField
                    id="cliente-nombre"
                    label={t('clientes:form.nombre')}
                    error={errors.nombre}
                    required
                >
                    <Input
                        id="cliente-nombre"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        autoFocus
                    />
                </FormField>
                <FormField
                    id="cliente-documento"
                    label={t('clientes:form.documento')}
                    error={errors.documento}
                >
                    <Input
                        id="cliente-documento"
                        value={data.documento}
                        onChange={(e) => setData('documento', e.target.value)}
                    />
                </FormField>
                <FormField
                    id="cliente-telefono"
                    label={t('clientes:form.telefono')}
                    error={errors.telefono}
                >
                    <Input
                        id="cliente-telefono"
                        value={data.telefono}
                        onChange={(e) => setData('telefono', e.target.value)}
                    />
                </FormField>
                <FormField
                    id="cliente-email"
                    label={t('clientes:form.email')}
                    error={errors.email}
                >
                    <Input
                        id="cliente-email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                    />
                </FormField>
                <FormField
                    id="cliente-notas"
                    label={t('clientes:form.notas')}
                    error={errors.notas}
                >
                    <Textarea
                        id="cliente-notas"
                        value={data.notas}
                        onChange={(e) => setData('notas', e.target.value)}
                        rows={3}
                    />
                </FormField>
            </FormSection>
        </FormModal>
    );
}

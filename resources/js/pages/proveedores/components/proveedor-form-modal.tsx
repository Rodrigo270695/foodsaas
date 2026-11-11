import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, FormModal, FormSection } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import compras from '../../compras/compras-routes';
import type { ProveedorRow } from '../../compras/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    proveedor: ProveedorRow | null;
};

type FormData = {
    nombre: string;
    ruc: string;
    telefono: string;
    email: string;
    notas: string;
    activo: boolean;
};

export function ProveedorFormModal({ open, onOpenChange, proveedor }: Props) {
    const { t } = useTranslation(['compras', 'common']);
    const isEdit = proveedor !== null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            nombre: '',
            ruc: '',
            telefono: '',
            email: '',
            notas: '',
            activo: true,
        });

    useEffect(() => {
        if (!open) return;
        clearErrors();
        setData({
            nombre: proveedor?.nombre ?? '',
            ruc: proveedor?.ruc ?? '',
            telefono: proveedor?.telefono ?? '',
            email: proveedor?.email ?? '',
            notas: proveedor?.notas ?? '',
            activo: proveedor?.activo ?? true,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, proveedor?.id]);

    const canSubmit = useMemo(
        () => !processing && data.nombre.trim().length > 0,
        [processing, data.nombre],
    );

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        };
        if (isEdit && proveedor) {
            put(compras.proveedores.update(proveedor.id).url, opts);
            return;
        }
        post(compras.proveedores.store().url, opts);
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={
                isEdit
                    ? t('proveedores.form.edit')
                    : t('proveedores.form.create')
            }
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
                        {t('common:actions.save')}
                    </Button>
                </>
            }
        >
            <FormSection index={0} title={t('proveedores.form.create')} columns={2}>
                <FormField
                    id="prov-nombre"
                    label={t('proveedores.form.nombre')}
                    required
                    error={errors.nombre}
                    className="sm:col-span-2"
                >
                    <Input
                        id="prov-nombre"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                    />
                </FormField>
                <FormField
                    id="prov-ruc"
                    label={t('proveedores.form.ruc')}
                    error={errors.ruc}
                >
                    <Input
                        id="prov-ruc"
                        value={data.ruc}
                        inputMode="numeric"
                        maxLength={11}
                        onChange={(e) =>
                            setData(
                                'ruc',
                                e.target.value.replace(/\D+/g, '').slice(0, 11),
                            )
                        }
                    />
                </FormField>
                <FormField
                    id="prov-tel"
                    label={t('proveedores.form.telefono')}
                    error={errors.telefono}
                >
                    <Input
                        id="prov-tel"
                        value={data.telefono}
                        onChange={(e) => setData('telefono', e.target.value)}
                    />
                </FormField>
                <FormField
                    id="prov-email"
                    label={t('proveedores.form.email')}
                    error={errors.email}
                    className="sm:col-span-2"
                >
                    <Input
                        id="prov-email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                    />
                </FormField>
                <FormField
                    id="prov-notas"
                    label={t('proveedores.form.notas')}
                    error={errors.notas}
                    className="sm:col-span-2"
                >
                    <Textarea
                        id="prov-notas"
                        value={data.notas}
                        onChange={(e) => setData('notas', e.target.value)}
                        rows={2}
                    />
                </FormField>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 sm:col-span-2">
                    <Checkbox
                        checked={data.activo}
                        onCheckedChange={(c) => setData('activo', c === true)}
                        className="mt-0.5"
                    />
                    <span className="text-sm font-medium">
                        {t('proveedores.form.activo')}
                    </span>
                </label>
            </FormSection>
        </FormModal>
    );
}

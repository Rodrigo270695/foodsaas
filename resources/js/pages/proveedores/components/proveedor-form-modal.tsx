import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DocumentNumberLookupField,
    FormField,
    FormModal,
    FormSection,
    soloDigitosDocumento,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toastManager } from '@/lib/toast';
import compras from '../../compras/compras-routes';
import type { ProveedorRow } from '../../compras/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    proveedor: ProveedorRow | null;
    initialNombre?: string;
    initialRuc?: string;
    onCreated?: () => void;
};

type FormData = {
    nombre: string;
    ruc: string;
    telefono: string;
    email: string;
    notas: string;
    activo: boolean;
};

type ApiPeruBody = {
    success?: boolean;
    message?: string;
    data?: {
        razon_social?: string;
        ruc?: string;
    };
};

export function ProveedorFormModal({
    open,
    onOpenChange,
    proveedor,
    initialNombre = '',
    initialRuc = '',
    onCreated,
}: Props) {
    const { t } = useTranslation(['compras', 'common', 'forms']);
    const isEdit = proveedor !== null;
    const [consultandoRuc, setConsultandoRuc] = useState(false);
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
        setConsultandoRuc(false);
        setData({
            nombre: proveedor?.nombre ?? initialNombre,
            ruc: proveedor?.ruc ?? soloDigitosDocumento(initialRuc, 11),
            telefono: proveedor?.telefono ?? '',
            email: proveedor?.email ?? '',
            notas: proveedor?.notas ?? '',
            activo: proveedor?.activo ?? true,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, proveedor?.id, initialNombre, initialRuc]);

    const canSubmit = useMemo(
        () =>
            !processing &&
            !consultandoRuc &&
            data.nombre.trim().length > 0,
        [processing, consultandoRuc, data.nombre],
    );

    const consultarRuc = async () => {
        const ruc = soloDigitosDocumento(data.ruc, 11);
        if (ruc.length !== 11) {
            toastManager.error({
                title: t('forms:document_lookup.invalid_ruc'),
            });
            return;
        }

        setConsultandoRuc(true);
        try {
            const res = await fetch(compras.proveedores.consultaRuc(ruc).url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            const body = (await res.json()) as ApiPeruBody;

            if (!res.ok || !body.success || !body.data) {
                toastManager.error({
                    title:
                        body.message ??
                        t('forms:document_lookup.ruc_error'),
                });
                return;
            }

            const razon = body.data.razon_social?.trim() ?? '';
            const rucOk = body.data.ruc ?? ruc;
            setData((prev) => ({
                ...prev,
                ruc: rucOk,
                nombre: razon || prev.nombre,
            }));
            if (razon) {
                toastManager.success({
                    title: t('forms:document_lookup.ruc_ok'),
                });
            }
        } catch {
            toastManager.error({
                title: t('forms:document_lookup.ruc_error'),
            });
        } finally {
            setConsultandoRuc(false);
        }
    };

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
                if (!isEdit) {
                    onCreated?.();
                }
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
            description={t('proveedores.form.description')}
            size="lg"
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={processing || consultandoRuc}
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
            <FormSection
                index={0}
                title={t('proveedores.form.section_identity')}
                description={t('proveedores.form.section_identity_hint')}
                columns={2}
            >
                <FormField
                    id="prov-ruc"
                    label={t('proveedores.form.ruc')}
                    hint={t('proveedores.form.ruc_hint')}
                    error={errors.ruc}
                    className="sm:col-span-2"
                >
                    <DocumentNumberLookupField
                        id="prov-ruc"
                        value={data.ruc}
                        onChange={(next) => setData('ruc', next)}
                        maxLength={11}
                        consulting={consultandoRuc}
                        disabled={processing}
                        invalid={Boolean(errors.ruc)}
                        onConsult={() => void consultarRuc()}
                        consultAriaLabel={t(
                            'forms:document_lookup.consultar_ruc',
                        )}
                    />
                </FormField>

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
                        placeholder={t(
                            'proveedores.form.nombre_placeholder',
                        )}
                        autoComplete="organization"
                        disabled={processing || consultandoRuc}
                    />
                </FormField>
            </FormSection>

            <FormSection
                index={1}
                title={t('proveedores.form.section_contact')}
                columns={2}
            >
                <FormField
                    id="prov-tel"
                    label={t('proveedores.form.telefono')}
                    error={errors.telefono}
                >
                    <Input
                        id="prov-tel"
                        type="tel"
                        value={data.telefono}
                        onChange={(e) => setData('telefono', e.target.value)}
                        disabled={processing}
                    />
                </FormField>
                <FormField
                    id="prov-email"
                    label={t('proveedores.form.email')}
                    error={errors.email}
                >
                    <Input
                        id="prov-email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        disabled={processing}
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
                        disabled={processing}
                    />
                </FormField>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:bg-muted/30 sm:col-span-2">
                    <Checkbox
                        checked={data.activo}
                        onCheckedChange={(c) => setData('activo', c === true)}
                        className="mt-0.5"
                        disabled={processing}
                    />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">
                            {t('proveedores.form.activo')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {t('proveedores.form.activo_hint')}
                        </span>
                    </div>
                </label>
            </FormSection>
        </FormModal>
    );
}

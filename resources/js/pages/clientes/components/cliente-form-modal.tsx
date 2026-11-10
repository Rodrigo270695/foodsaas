import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DocumentNumberLookupField,
    DocumentTypeSelect,
    FormField,
    FormModal,
    FormSection,
    STAFF_DOCUMENT_TYPE_CODES,
    isStaffDocumentTypeCode,
    soloDigitosDocumento,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toastManager } from '@/lib/toast';

export type ClienteFormRow = {
    id: string;
    nombre: string;
    documento_tipo?: string | null;
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
    documento_tipo: string;
    documento: string;
    telefono: string;
    email: string;
    notas: string;
};

const normalizeDocumentoTipo = (raw: string | null | undefined): string => {
    if (!raw) {
        return 'DNI';
    }
    const u = raw.trim().toUpperCase();
    return isStaffDocumentTypeCode(u) ? u : 'DNI';
};

export function ClienteFormModal({
    open,
    onOpenChange,
    cliente,
}: ClienteFormModalProps) {
    const { t } = useTranslation(['clientes', 'common']);
    const isEdit = cliente !== null;
    const [consultandoDoc, setConsultandoDoc] = useState(false);
    const lastConsultaKeyRef = useRef<string | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            nombre: '',
            documento_tipo: 'DNI',
            documento: '',
            telefono: '',
            email: '',
            notas: '',
        });

    const tipoDoc = data.documento_tipo.trim().toUpperCase();
    const isDni = tipoDoc === 'DNI';
    const docMaxLen = isDni ? 8 : undefined;
    const docCompleto =
        docMaxLen !== undefined &&
        soloDigitosDocumento(data.documento).length === docMaxLen;

    useEffect(() => {
        if (!open) {
            return;
        }
        clearErrors();
        setConsultandoDoc(false);
        const tipo = normalizeDocumentoTipo(cliente?.documento_tipo);
        const numero = cliente?.documento ?? '';
        setData({
            nombre: cliente?.nombre ?? '',
            documento_tipo: tipo,
            documento: numero,
            telefono: cliente?.telefono ?? '',
            email: cliente?.email ?? '',
            notas: cliente?.notas ?? '',
        });
        const max = tipo === 'DNI' ? 8 : undefined;
        const digits = soloDigitosDocumento(numero, max);
        lastConsultaKeyRef.current =
            max !== undefined && digits.length === max ? `${tipo}:${digits}` : null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, cliente?.id]);

    const onConsultarDni = async (forcedNumero?: string) => {
        const dni = soloDigitosDocumento(forcedNumero ?? data.documento, 8);
        if (dni.length !== 8) {
            toastManager.error({
                title: t('clientes:form.consultar_invalid_dni'),
            });
            return;
        }
        const key = `DNI:${dni}`;
        lastConsultaKeyRef.current = key;
        setConsultandoDoc(true);
        try {
            const res = await fetch(
                `/clientes/consulta-dni?dni=${encodeURIComponent(dni)}`,
                {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                },
            );
            const body = (await res.json()) as {
                success?: boolean;
                message?: string;
                data?: {
                    nombre_completo?: string;
                    nombres?: string;
                    apellidos?: string;
                    dni?: string;
                };
            };
            if (!res.ok || !body.success || !body.data) {
                toastManager.error({
                    title:
                        body.message ?? t('clientes:form.consultar_error'),
                });
                return;
            }
            const completo =
                body.data.nombre_completo?.trim() ||
                [body.data.nombres, body.data.apellidos]
                    .filter(Boolean)
                    .join(' ')
                    .trim();
            setData((prev) => ({
                ...prev,
                documento_tipo: 'DNI',
                documento: body.data?.dni ?? dni,
                nombre: completo || prev.nombre,
            }));
            if (completo) {
                toastManager.success({
                    title: t('clientes:form.consultar_ok'),
                });
            }
        } catch {
            toastManager.error({ title: t('clientes:form.consultar_error') });
        } finally {
            setConsultandoDoc(false);
        }
    };

    useEffect(() => {
        if (!open || !isDni || !docCompleto || consultandoDoc || processing) {
            return;
        }
        const digits = soloDigitosDocumento(data.documento, 8);
        const key = `DNI:${digits}`;
        if (lastConsultaKeyRef.current === key) {
            return;
        }
        void onConsultarDni(digits);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        open,
        data.documento,
        tipoDoc,
        docCompleto,
        consultandoDoc,
        processing,
    ]);

    const handleTipoChange = (value: string) => {
        const next = value.trim().toUpperCase();
        setData((prev) => ({
            ...prev,
            documento_tipo: next || 'DNI',
            documento:
                next === 'DNI'
                    ? soloDigitosDocumento(prev.documento, 8)
                    : prev.documento,
        }));
        lastConsultaKeyRef.current = null;
    };

    const canSubmit = useMemo(() => {
        if (processing || consultandoDoc) {
            return false;
        }
        if (data.nombre.trim().length < 2) {
            return false;
        }
        if (isDni && data.documento !== '') {
            return soloDigitosDocumento(data.documento).length === 8;
        }
        return true;
    }, [processing, consultandoDoc, data.nombre, data.documento, isDni]);

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
            <FormSection
                index={0}
                title={t('clientes:form.section_identity')}
                description={t('clientes:form.section_identity_hint')}
                columns={2}
            >
                <FormField
                    id="cliente-documento-tipo"
                    label={t('clientes:form.documento_tipo')}
                    error={errors.documento_tipo}
                >
                    <DocumentTypeSelect
                        id="cliente-documento-tipo"
                        value={data.documento_tipo}
                        onValueChange={handleTipoChange}
                        codes={STAFF_DOCUMENT_TYPE_CODES}
                        invalid={Boolean(errors.documento_tipo)}
                        disabled={processing}
                    />
                </FormField>

                <FormField
                    id="cliente-documento"
                    label={t('clientes:form.documento')}
                    error={errors.documento}
                >
                    <DocumentNumberLookupField
                        id="cliente-documento"
                        value={data.documento}
                        onChange={(next) => setData('documento', next)}
                        maxLength={docMaxLen}
                        consulting={consultandoDoc}
                        disabled={processing}
                        invalid={Boolean(errors.documento)}
                        onConsult={() => void onConsultarDni()}
                        consultAriaLabel={t('clientes:form.consultar_dni')}
                    />
                </FormField>

                <FormField
                    id="cliente-nombre"
                    label={t('clientes:form.nombre')}
                    error={errors.nombre}
                    required
                    className="sm:col-span-2"
                >
                    <Input
                        id="cliente-nombre"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        placeholder={t('clientes:form.nombre_placeholder')}
                        autoComplete="off"
                    />
                </FormField>
            </FormSection>

            <FormSection
                index={1}
                title={t('clientes:form.section_contact')}
                columns={2}
            >
                <FormField
                    id="cliente-telefono"
                    label={t('clientes:form.telefono')}
                    error={errors.telefono}
                >
                    <Input
                        id="cliente-telefono"
                        type="tel"
                        value={data.telefono}
                        onChange={(e) => setData('telefono', e.target.value)}
                        placeholder={t('clientes:form.telefono_placeholder')}
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
                        placeholder={t('clientes:form.email_placeholder')}
                    />
                </FormField>
                <FormField
                    id="cliente-notas"
                    label={t('clientes:form.notas')}
                    error={errors.notas}
                    className="sm:col-span-2"
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

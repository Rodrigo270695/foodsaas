import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CLIENTE_DOCUMENT_TYPE_CODES,
    DocumentNumberLookupField,
    DocumentTypeSelect,
    FormField,
    FormModal,
    FormSection,
    documentNumberLengthFor,
    isClienteDocumentTypeCode,
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
    return isClienteDocumentTypeCode(u) ? u : 'DNI';
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
    const docMaxLen = documentNumberLengthFor(tipoDoc);
    const isLookupTipo = tipoDoc === 'DNI' || tipoDoc === 'RUC';
    const docDigits = soloDigitosDocumento(data.documento, docMaxLen);
    const docCompleto =
        docMaxLen !== undefined && docDigits.length === docMaxLen;

    useEffect(() => {
        if (!open) {
            return;
        }
        clearErrors();
        setConsultandoDoc(false);
        const tipo = normalizeDocumentoTipo(cliente?.documento_tipo);
        const max = documentNumberLengthFor(tipo);
        const numero = soloDigitosDocumento(cliente?.documento ?? '', max);
        setData({
            nombre: cliente?.nombre ?? '',
            documento_tipo: tipo,
            documento: numero,
            telefono: cliente?.telefono ?? '',
            email: cliente?.email ?? '',
            notas: cliente?.notas ?? '',
        });
        lastConsultaKeyRef.current =
            max !== undefined &&
            (tipo === 'DNI' || tipo === 'RUC') &&
            numero.length === max
                ? `${tipo}:${numero}`
                : null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, cliente?.id]);

    const onConsultarDocumento = async (forcedNumero?: string) => {
        if (!isLookupTipo || docMaxLen === undefined) {
            return;
        }
        const digits = soloDigitosDocumento(
            forcedNumero ?? data.documento,
            docMaxLen,
        );
        if (digits.length !== docMaxLen) {
            toastManager.error({
                title:
                    tipoDoc === 'RUC'
                        ? t('clientes:form.consultar_invalid_ruc')
                        : t('clientes:form.consultar_invalid_dni'),
            });
            return;
        }
        const key = `${tipoDoc}:${digits}`;
        lastConsultaKeyRef.current = key;
        setConsultandoDoc(true);
        try {
            const url =
                tipoDoc === 'RUC'
                    ? `/clientes/consulta-ruc?ruc=${encodeURIComponent(digits)}`
                    : `/clientes/consulta-dni?dni=${encodeURIComponent(digits)}`;
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            const body = (await res.json()) as {
                success?: boolean;
                message?: string;
                data?: {
                    nombre_completo?: string;
                    nombres?: string;
                    apellidos?: string;
                    dni?: string;
                    razon_social?: string;
                    ruc?: string;
                };
            };
            if (!res.ok || !body.success || !body.data) {
                toastManager.error({
                    title:
                        body.message ??
                        (tipoDoc === 'RUC'
                            ? t('clientes:form.consultar_ruc_error')
                            : t('clientes:form.consultar_error')),
                });
                return;
            }

            if (tipoDoc === 'RUC') {
                const razon = body.data.razon_social?.trim() ?? '';
                setData((prev) => ({
                    ...prev,
                    documento_tipo: 'RUC',
                    documento: body.data?.ruc ?? digits,
                    nombre: razon || prev.nombre,
                }));
                if (razon) {
                    toastManager.success({
                        title: t('clientes:form.consultar_ruc_ok'),
                    });
                }
            } else {
                const completo =
                    body.data.nombre_completo?.trim() ||
                    [body.data.nombres, body.data.apellidos]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                setData((prev) => ({
                    ...prev,
                    documento_tipo: 'DNI',
                    documento: body.data?.dni ?? digits,
                    nombre: completo || prev.nombre,
                }));
                if (completo) {
                    toastManager.success({
                        title: t('clientes:form.consultar_ok'),
                    });
                }
            }
        } catch {
            toastManager.error({
                title:
                    tipoDoc === 'RUC'
                        ? t('clientes:form.consultar_ruc_error')
                        : t('clientes:form.consultar_error'),
            });
        } finally {
            setConsultandoDoc(false);
        }
    };

    useEffect(() => {
        if (
            !open ||
            !isLookupTipo ||
            !docCompleto ||
            consultandoDoc ||
            processing
        ) {
            return;
        }
        const digits = soloDigitosDocumento(data.documento, docMaxLen);
        const key = `${tipoDoc}:${digits}`;
        if (lastConsultaKeyRef.current === key) {
            return;
        }
        void onConsultarDocumento(digits);
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
        const next = value.trim().toUpperCase() || 'DNI';
        const max = documentNumberLengthFor(next);
        setData((prev) => ({
            ...prev,
            documento_tipo: next,
            documento: soloDigitosDocumento(prev.documento, max),
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
        const doc = data.documento.trim();
        if (doc === '') {
            return true;
        }
        if (docMaxLen === undefined) {
            return false;
        }
        return soloDigitosDocumento(doc).length === docMaxLen;
    }, [
        processing,
        consultandoDoc,
        data.nombre,
        data.documento,
        docMaxLen,
    ]);

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

    const consultAriaLabel =
        tipoDoc === 'RUC'
            ? t('clientes:form.consultar_ruc')
            : t('clientes:form.consultar_dni');

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
                        codes={CLIENTE_DOCUMENT_TYPE_CODES}
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
                        onConsult={
                            isLookupTipo
                                ? () => void onConsultarDocumento()
                                : undefined
                        }
                        consultAriaLabel={consultAriaLabel}
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

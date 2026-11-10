import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CLIENTE_DOCUMENT_TYPE_CODES,
    DocumentLookupFields,
    FormField,
    FormModal,
    FormSection,
    documentNumberLengthFor,
    isClienteDocumentTypeCode,
    isDocumentoNumeroValid,
    soloDigitosDocumento,
} from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
    const { t } = useTranslation(['clientes', 'common', 'forms']);
    const isEdit = cliente !== null;
    const [consultandoDoc, setConsultandoDoc] = useState(false);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<FormData>({
            nombre: '',
            documento_tipo: 'DNI',
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
        setConsultandoDoc(false);
        const tipo = normalizeDocumentoTipo(cliente?.documento_tipo);
        const max = documentNumberLengthFor(tipo);
        setData({
            nombre: cliente?.nombre ?? '',
            documento_tipo: tipo,
            documento: soloDigitosDocumento(cliente?.documento ?? '', max),
            telefono: cliente?.telefono ?? '',
            email: cliente?.email ?? '',
            notas: cliente?.notas ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, cliente?.id]);

    const canSubmit = useMemo(() => {
        if (processing || consultandoDoc) {
            return false;
        }
        if (data.nombre.trim().length < 2) {
            return false;
        }
        return isDocumentoNumeroValid(data.documento_tipo, data.documento);
    }, [
        processing,
        consultandoDoc,
        data.nombre,
        data.documento,
        data.documento_tipo,
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
                <DocumentLookupFields
                    tipoId="cliente-documento-tipo"
                    numeroId="cliente-documento"
                    tipo={data.documento_tipo}
                    numero={data.documento}
                    onTipoChange={(tipo) => setData('documento_tipo', tipo)}
                    onNumeroChange={(numero) => setData('documento', numero)}
                    onResolved={({ tipo, numero, nombre }) =>
                        setData((prev) => ({
                            ...prev,
                            documento_tipo: tipo,
                            documento: numero,
                            nombre,
                        }))
                    }
                    codes={CLIENTE_DOCUMENT_TYPE_CODES}
                    endpoints={{
                        dni: (dni) =>
                            `/clientes/consulta-dni?dni=${encodeURIComponent(dni)}`,
                        ruc: (ruc) =>
                            `/clientes/consulta-ruc?ruc=${encodeURIComponent(ruc)}`,
                    }}
                    resetKey={cliente?.id ?? 'new'}
                    enabled={open}
                    disabled={processing}
                    errors={{
                        tipo: errors.documento_tipo,
                        numero: errors.documento,
                    }}
                    labels={{
                        tipo: t('clientes:form.documento_tipo'),
                        numero: t('clientes:form.documento'),
                    }}
                    onConsultingChange={setConsultandoDoc}
                />

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

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
import clientes from '../clientes-routes';

export type ClienteFormRow = {
    id: string;
    nombre: string;
    documento_tipo?: string | null;
    documento: string | null;
    telefono: string | null;
    email: string | null;
    notas: string | null;
};

export type ClienteQuickCreated = {
    nombre: string;
    telefono: string;
    documento: string;
};

type FormData = {
    nombre: string;
    documento_tipo: string;
    documento: string;
    telefono: string;
    email: string;
    notas: string;
};

type ClienteFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cliente: ClienteFormRow | null;
    /** Prefill al crear (p. ej. desde reservas). */
    initialDraft?: Partial<
        Pick<FormData, 'nombre' | 'telefono' | 'documento' | 'documento_tipo'>
    >;
    /** Tras crear con éxito (antes de cerrar). */
    onCreated?: (created: ClienteQuickCreated) => void;
    className?: string;
    showOverlay?: boolean;
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
    initialDraft,
    onCreated,
    className,
    showOverlay = true,
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
        const tipo = normalizeDocumentoTipo(
            cliente?.documento_tipo ?? initialDraft?.documento_tipo,
        );
        const max = documentNumberLengthFor(tipo);
        const docSource =
            cliente?.documento ?? initialDraft?.documento ?? '';
        setData({
            nombre: cliente?.nombre ?? initialDraft?.nombre ?? '',
            documento_tipo: tipo,
            documento: soloDigitosDocumento(docSource, max),
            telefono: cliente?.telefono ?? initialDraft?.telefono ?? '',
            email: cliente?.email ?? '',
            notas: cliente?.notas ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, cliente?.id, initialDraft?.nombre, initialDraft?.telefono]);

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
                if (!isEdit) {
                    onCreated?.({
                        nombre: data.nombre.trim(),
                        telefono: data.telefono.trim(),
                        documento: data.documento.trim(),
                    });
                }
                reset();
                onOpenChange(false);
            },
        };
        if (isEdit && cliente) {
            put(clientes.update(cliente.id).url, opts);
            return;
        }
        post(clientes.store().url, opts);
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
            className={className}
            showOverlay={showOverlay}
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
                        dni: (dni) => clientes.consultaDni(dni).url,
                        ruc: (ruc) => clientes.consultaRuc(ruc).url,
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

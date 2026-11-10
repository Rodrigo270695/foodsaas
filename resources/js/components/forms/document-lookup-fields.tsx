import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { documentNumberLengthFor } from '@/lib/document-type-options';
import { toastManager } from '@/lib/toast';
import { DocumentNumberLookupField, soloDigitosDocumento } from './document-number-lookup-field';
import { DocumentTypeSelect } from './document-type-select';
import { FormField } from './form-field';

export type DocumentoConsultaResolved = {
    tipo: string;
    numero: string;
    nombre: string;
};

export type DocumentoLookupEndpoints = {
    dni?: (dni: string) => string;
    ruc?: (ruc: string) => string;
};

export type DocumentLookupFieldsProps = {
    tipoId: string;
    numeroId: string;
    tipo: string;
    numero: string;
    onTipoChange: (tipo: string) => void;
    onNumeroChange: (numero: string) => void;
    /** Se llama al resolver nombre/razón social desde API Perú. */
    onResolved: (result: DocumentoConsultaResolved) => void;
    /** Catálogo de tipos (DNI/RUC/CE, staff, etc.). */
    codes: readonly string[];
    endpoints: DocumentoLookupEndpoints;
    /** Cambia con cada apertura/registro para no reconsultar datos ya cargados. */
    resetKey?: string | number | null;
    /** Si false, no dispara consulta automática (p. ej. modal cerrado). */
    enabled?: boolean;
    disabled?: boolean;
    errors?: {
        tipo?: string;
        numero?: string;
    };
    labels?: {
        tipo?: string;
        numero?: string;
    };
    onConsultingChange?: (consulting: boolean) => void;
};

type ApiPeruBody = {
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

function isLookupTipo(tipo: string): tipo is 'DNI' | 'RUC' {
    return tipo === 'DNI' || tipo === 'RUC';
}

/**
 * Tipo + número de documento con contador, botón de búsqueda dentro del input
 * y consulta automática RENIEC/SUNAT (API Perú) al completar DNI/RUC.
 */
export function DocumentLookupFields({
    tipoId,
    numeroId,
    tipo,
    numero,
    onTipoChange,
    onNumeroChange,
    onResolved,
    codes,
    endpoints,
    resetKey = null,
    enabled = true,
    disabled = false,
    errors,
    labels,
    onConsultingChange,
}: DocumentLookupFieldsProps) {
    const { t } = useTranslation('forms');
    const [consulting, setConsulting] = useState(false);
    const lastConsultaKeyRef = useRef<string | null>(null);
    const onResolvedRef = useRef(onResolved);
    const onConsultingChangeRef = useRef(onConsultingChange);
    const endpointsRef = useRef(endpoints);

    onResolvedRef.current = onResolved;
    onConsultingChangeRef.current = onConsultingChange;
    endpointsRef.current = endpoints;

    const tipoDoc = tipo.trim().toUpperCase();
    const docMaxLen = documentNumberLengthFor(tipoDoc);
    const canLookup =
        isLookupTipo(tipoDoc) &&
        ((tipoDoc === 'DNI' && Boolean(endpoints.dni)) ||
            (tipoDoc === 'RUC' && Boolean(endpoints.ruc)));
    const digits = soloDigitosDocumento(numero, docMaxLen);
    const docCompleto =
        docMaxLen !== undefined && digits.length === docMaxLen;

    const setConsultingState = (next: boolean) => {
        setConsulting(next);
        onConsultingChangeRef.current?.(next);
    };

    useEffect(() => {
        setConsultingState(false);
        const max = documentNumberLengthFor(tipoDoc);
        const currentDigits = soloDigitosDocumento(numero, max);
        lastConsultaKeyRef.current =
            enabled &&
            canLookup &&
            max !== undefined &&
            currentDigits.length === max
                ? `${tipoDoc}:${currentDigits}`
                : null;
        // Solo al cambiar de registro / apertura.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey, enabled]);

    const consultar = async (forcedNumero?: string) => {
        if (!isLookupTipo(tipoDoc) || docMaxLen === undefined) {
            return;
        }

        const value = soloDigitosDocumento(forcedNumero ?? numero, docMaxLen);
        if (value.length !== docMaxLen) {
            toastManager.error({
                title:
                    tipoDoc === 'RUC'
                        ? t('document_lookup.invalid_ruc')
                        : t('document_lookup.invalid_dni'),
            });
            return;
        }

        const buildUrl =
            tipoDoc === 'RUC'
                ? endpointsRef.current.ruc
                : endpointsRef.current.dni;
        if (!buildUrl) {
            return;
        }

        const key = `${tipoDoc}:${value}`;
        lastConsultaKeyRef.current = key;
        setConsultingState(true);

        try {
            const res = await fetch(buildUrl(value), {
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
                        (tipoDoc === 'RUC'
                            ? t('document_lookup.ruc_error')
                            : t('document_lookup.dni_error')),
                });
                return;
            }

            if (tipoDoc === 'RUC') {
                const razon = body.data.razon_social?.trim() ?? '';
                const ruc = body.data.ruc ?? value;
                onNumeroChange(ruc);
                if (razon) {
                    onResolvedRef.current({
                        tipo: 'RUC',
                        numero: ruc,
                        nombre: razon,
                    });
                    toastManager.success({
                        title: t('document_lookup.ruc_ok'),
                    });
                }
                return;
            }

            const completo =
                body.data.nombre_completo?.trim() ||
                [body.data.nombres, body.data.apellidos]
                    .filter(Boolean)
                    .join(' ')
                    .trim();
            const dni = body.data.dni ?? value;
            onNumeroChange(dni);
            if (completo) {
                onResolvedRef.current({
                    tipo: 'DNI',
                    numero: dni,
                    nombre: completo,
                });
                toastManager.success({
                    title: t('document_lookup.dni_ok'),
                });
            }
        } catch {
            toastManager.error({
                title:
                    tipoDoc === 'RUC'
                        ? t('document_lookup.ruc_error')
                        : t('document_lookup.dni_error'),
            });
        } finally {
            setConsultingState(false);
        }
    };

    useEffect(() => {
        if (
            !enabled ||
            !canLookup ||
            !docCompleto ||
            consulting ||
            disabled
        ) {
            return;
        }
        const key = `${tipoDoc}:${digits}`;
        if (lastConsultaKeyRef.current === key) {
            return;
        }
        void consultar(digits);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        enabled,
        canLookup,
        docCompleto,
        digits,
        tipoDoc,
        consulting,
        disabled,
    ]);

    const handleTipoChange = (value: string) => {
        const next = value.trim().toUpperCase();
        const max = documentNumberLengthFor(next);
        lastConsultaKeyRef.current = null;
        onTipoChange(next);
        onNumeroChange(soloDigitosDocumento(numero, max));
    };

    return (
        <>
            <FormField
                id={tipoId}
                label={labels?.tipo ?? t('document_lookup.tipo')}
                error={errors?.tipo}
            >
                <DocumentTypeSelect
                    id={tipoId}
                    value={tipo}
                    onValueChange={handleTipoChange}
                    codes={codes}
                    invalid={Boolean(errors?.tipo)}
                    disabled={disabled || consulting}
                />
            </FormField>

            <FormField
                id={numeroId}
                label={labels?.numero ?? t('document_lookup.numero')}
                error={errors?.numero}
            >
                <DocumentNumberLookupField
                    id={numeroId}
                    value={numero}
                    onChange={onNumeroChange}
                    maxLength={docMaxLen}
                    consulting={consulting}
                    disabled={disabled}
                    invalid={Boolean(errors?.numero)}
                    onConsult={canLookup ? () => void consultar() : undefined}
                    consultAriaLabel={
                        tipoDoc === 'RUC'
                            ? t('document_lookup.consultar_ruc')
                            : t('document_lookup.consultar_dni')
                    }
                />
            </FormField>
        </>
    );
}

/** Valida número opcional según tipo (DNI 8 / RUC 11 / CE 9). */
export function isDocumentoNumeroValid(
    tipo: string,
    numero: string,
): boolean {
    const trimmed = numero.trim();
    if (trimmed === '') {
        return true;
    }
    const max = documentNumberLengthFor(tipo);
    if (max === undefined) {
        return trimmed.length > 0;
    }

    return soloDigitosDocumento(trimmed).length === max;
}

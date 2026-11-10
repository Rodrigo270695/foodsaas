/**
 * Tipos de documento para titulares (propietarios).
 * Mantener alineado con `App\Support\PropietarioTipoDocumento::VALUES`.
 */
export const PROPIETARIO_DOCUMENT_TYPE_CODES = [
    'DNI',
    'RUC',
    'CE',
    'PAS',
    'OTR',
] as const;

export type PropietarioDocumentTypeCode =
    (typeof PROPIETARIO_DOCUMENT_TYPE_CODES)[number];

export function isPropietarioDocumentTypeCode(
    value: string,
): value is PropietarioDocumentTypeCode {
    return (PROPIETARIO_DOCUMENT_TYPE_CODES as readonly string[]).includes(value);
}

/** Tipos de documento del CRM de clientes (persona / empresa). */
export const CLIENTE_DOCUMENT_TYPE_CODES = ['DNI', 'RUC', 'CE'] as const;

export type ClienteDocumentTypeCode =
    (typeof CLIENTE_DOCUMENT_TYPE_CODES)[number];

export function isClienteDocumentTypeCode(
    value: string,
): value is ClienteDocumentTypeCode {
    return (CLIENTE_DOCUMENT_TYPE_CODES as readonly string[]).includes(value);
}

/** Longitud exacta (solo dígitos) por tipo de documento peruano. */
export const DOCUMENT_NUMBER_LENGTH: Record<ClienteDocumentTypeCode, number> = {
    DNI: 8,
    RUC: 11,
    CE: 9,
};

export function documentNumberLengthFor(tipo: string): number | undefined {
    const key = tipo.trim().toUpperCase();
    if (key === 'DNI' || key === 'RUC' || key === 'CE') {
        return DOCUMENT_NUMBER_LENGTH[key];
    }

    return undefined;
}

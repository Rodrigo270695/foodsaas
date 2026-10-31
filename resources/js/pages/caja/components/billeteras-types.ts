export const CAJA_BILLETERAS = [
    'yape',
    'plin',
    'transferencia',
    'agora',
    'sip',
] as const;

export type CajaBilleteraCodigo = (typeof CAJA_BILLETERAS)[number];

export type SaldosBilleterasForm = Record<CajaBilleteraCodigo, string>;

export function emptySaldosBilleteras(fill = '0'): SaldosBilleterasForm {
    return {
        yape: fill,
        plin: fill,
        transferencia: fill,
        agora: fill,
        sip: fill,
    };
}

export type TicketAnchoMm = '56' | '57' | '58' | '80';

export const TICKET_ANCHO_OPTIONS: readonly TicketAnchoMm[] = [
    '56',
    '57',
    '58',
    '80',
];

/** Ancho útil del cabezal (mm), igual que App\Support\Caja\TicketAnchoMm::printableMm. */
export function printableMm(ancho: TicketAnchoMm): 48 | 72 {
    return ancho === '80' ? 72 : 48;
}

/**
 * Ancho relativo de la vista previa frente al rollo de 80 (~72 mm útiles = 100%).
 * Así 56/57/58 se ven más estrechos que 80 (el PDF viewer escala al iframe).
 */
export function previewWidthPercent(ancho: TicketAnchoMm): number {
    return Math.round((printableMm(ancho) / 72) * 100);
}

export function normalizeTicketAncho(
    value: string | null | undefined,
    fallback: TicketAnchoMm = '58',
): TicketAnchoMm {
    if (value === '72') {
        return '80';
    }

    if (value === '56' || value === '57' || value === '58' || value === '80') {
        return value;
    }

    return fallback;
}

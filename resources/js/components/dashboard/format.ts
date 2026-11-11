export function money(value: number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(value);
}

export function compactNumber(value: number): string {
    return new Intl.NumberFormat('es-PE', {
        notation: value >= 1000 ? 'compact' : 'standard',
        maximumFractionDigits: value >= 1000 ? 1 : 0,
    }).format(value);
}

export const CHART_COLORS = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
] as const;

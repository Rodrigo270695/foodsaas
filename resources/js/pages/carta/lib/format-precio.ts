export function formatPrecio(value: string): string {
    const num = Number.parseFloat(value);
    if (Number.isNaN(num)) {
        return value;
    }

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
    }).format(num);
}

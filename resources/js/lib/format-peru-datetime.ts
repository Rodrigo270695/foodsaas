/** Zona horaria operativa FoodSaaS (Perú). */
export const APP_TIMEZONE = 'America/Lima';

const TIME_OPTS: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: APP_TIMEZONE,
};

const DATE_OPTS: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: APP_TIMEZONE,
};

function parseIso(iso: string): Date | null {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Hora corta en hora de Perú, p. ej. "04:04 p. m." */
export function formatPeruTime(iso: string, locale = 'es-PE'): string {
    const d = parseIso(iso);
    if (!d) {
        return '—';
    }
    return d.toLocaleTimeString(locale, TIME_OPTS);
}

/** Fecha corta en calendario de Perú. */
export function formatPeruDate(iso: string, locale = 'es-PE'): string {
    const d = parseIso(iso);
    if (!d) {
        return '—';
    }
    return d.toLocaleDateString(locale, DATE_OPTS);
}

export function formatPeruDateTime(iso: string, locale = 'es-PE'): {
    fecha: string;
    hora: string;
} {
    return {
        fecha: formatPeruDate(iso, locale),
        hora: formatPeruTime(iso, locale),
    };
}

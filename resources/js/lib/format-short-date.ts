const LOCALE_MAP: Record<string, string> = {
    es: 'es-PE',
    en: 'en-US',
};

export function resolveIntlLocale(localeCode: string | undefined): string {
    if (!localeCode) {
        return 'es-PE';
    }

    const base = localeCode.split('-')[0]?.toLowerCase() ?? 'es';

    return LOCALE_MAP[base] ?? 'es-PE';
}

/** Fecha corta estable entre SSR y cliente (usa locale de la app, no del navegador). */
export function formatShortDate(iso: string, localeCode: string): string {
    return new Date(iso).toLocaleDateString(resolveIntlLocale(localeCode), {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

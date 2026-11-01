/** Mapeo ruta sidebar → clave módulo tenant (futuro `tenants.modulos_deshabilitados`). */
export const NAV_HREF_MODULE_KEYS: Record<string, string> = {
    '/facturacion/documentos': 'documentos',
    '/facturacion/series': 'series',
    '/facturacion/notas-baja': 'notas_baja',
    '/facturacion/resumenes': 'resumenes',
};

export function moduleKeyForHref(href: string): string | undefined {
    return NAV_HREF_MODULE_KEYS[href];
}

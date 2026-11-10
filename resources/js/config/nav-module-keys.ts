/** Mapeo ruta sidebar → clave módulo tenant (`tenants.modulos_deshabilitados`). */
export const NAV_HREF_MODULE_KEYS: Record<string, string> = {
    '/salon': 'salon',
    '/pedidos': 'pedidos',
    '/cocina': 'cocina',
    '/delivery': 'delivery',
    '/reservas': 'reservas',
    '/caja': 'caja',
    '/ventas': 'ventas',
    '/clientes': 'clientes',
    '/reportes': 'reportes',
    '/carta': 'carta',
    '/almacen': 'almacen',
    '/facturacion/documentos': 'documentos',
    '/facturacion/series': 'series',
    '/facturacion/notas-baja': 'notas_baja',
    '/facturacion/resumenes': 'resumenes',
    '/configuracion/general': 'config_general',
    '/configuracion/suscripcion': 'config_suscripcion',
    '/configuracion/sedes': 'sedes',
    '/configuracion/usuarios': 'usuarios',
    '/configuracion/roles': 'roles',
};

export function moduleKeyForHref(href: string): string | undefined {
    return NAV_HREF_MODULE_KEYS[href];
}

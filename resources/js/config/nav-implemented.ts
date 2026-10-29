/**
 * Rutas del sidebar aún sin módulo. Se ocultan hasta implementar la pantalla.
 */
export const NAV_PLACEHOLDER_PATHS: ReadonlySet<string> = new Set([
    '/plataforma/configuracion',
    '/plataforma/operaciones',
    '/plataforma/esquema',
    '/plataforma/sesiones-login',
    '/plataforma/reportes',
    '/plataforma/reportes/mapa',
    '/plataforma/cobros',
    '/plataforma/salesbot-conversations',
    '/plataforma/salesbot-knowledge',
    '/plataforma/uso-planes',
    '/plataforma/bot-ia-announcements',
    '/plataforma/in-app-assistant-knowledge',
]);

export function isNavRouteImplemented(href: string): boolean {
    const path = href.split('?')[0] ?? href;

    return !NAV_PLACEHOLDER_PATHS.has(path);
}

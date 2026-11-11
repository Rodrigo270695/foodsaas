/** Clave de módulo tenant → clave en `nav:items.*` */
export const MODULE_NAV_LABEL_KEYS: Record<string, string> = {
    salon: 'salon',
    pedidos: 'pedidos',
    cocina: 'cocina',
    delivery: 'delivery',
    reservas: 'reservas',
    caja: 'caja',
    ventas: 'ventas',
    clientes: 'clientes',
    reportes: 'reportes',
    carta: 'carta',
    almacen: 'almacen',
    insumos: 'insumos',
    compras: 'compras',
    documentos: 'documentos',
    series: 'series',
    notas_baja: 'notas_baja',
    resumenes: 'resumenes',
    config_general: 'general',
    config_suscripcion: 'mi_suscripcion',
    sedes: 'sedes',
    usuarios: 'usuarios',
    roles: 'roles',
};

export function navLabelKeyForModule(moduleKey: string): string {
    return MODULE_NAV_LABEL_KEYS[moduleKey] ?? moduleKey;
}

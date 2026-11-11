export type TenantDashboardData = {
    sede_id: string | null;
    kpis: {
        ventas_hoy: number;
        ventas_ayer: number;
        delta_pct: number | null;
        ventas_count: number;
        ticket_promedio: number;
        pedidos_abiertos: number;
        cocina_en_cola: number;
        mesas_ocupadas: number;
        caja_abierta: boolean;
    };
    ventas_trend: Array<{
        date: string;
        label: string;
        monto: number;
        count: number;
    }>;
    medios: Array<{ medio: string; monto: number; count: number }>;
    por_canal: Array<{ canal: string; count: number; monto: number }>;
    top_productos: Array<{
        nombre: string;
        cantidad: number;
        importe: number;
    }>;
};

export type PlatformDashboardData = {
    kpis: {
        tenants_total: number;
        tenants_active: number;
        tenants_trial: number;
        tenants_suspended: number;
        tenants_cancelled: number;
        mrr: number;
        users_total: number;
        planes_activos: number;
    };
    por_estado: Array<{ estado: string; count: number }>;
    por_plan: Array<{
        plan: string;
        codigo: string;
        count: number;
        color: string | null;
    }>;
    altas_trend: Array<{ date: string; label: string; count: number }>;
    recientes: Array<{
        id: string;
        slug: string;
        nombre: string;
        estado: string;
        plan: string | null;
        created_at: string;
    }>;
};

export type DashboardProps = {
    mode: 'tenant' | 'platform';
    /** Métricas del dashboard tenant (no confundir con el share `tenant`). */
    tenantMetrics: TenantDashboardData | null;
    platformMetrics: PlatformDashboardData | null;
};

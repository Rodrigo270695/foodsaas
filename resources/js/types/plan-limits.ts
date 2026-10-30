export type PlanLimitFeature =
    | 'max_sedes'
    | 'max_usuarios'
    | 'max_productos'
    | 'max_mesas'
    | 'max_pedidos_mes'
    | 'max_comprobantes_mes';

export type PlanLimitSemaphore = 'green' | 'yellow' | 'red';

export type PlanLimitEntry = {
    limit: number | null;
    used: number;
    remaining: number | null;
    reached: boolean;
    unlimited: boolean;
    semaphore: PlanLimitSemaphore;
    usage_pct: number | null;
};

export type PlanLimitsSnapshot = Partial<
    Record<PlanLimitFeature, PlanLimitEntry>
>;

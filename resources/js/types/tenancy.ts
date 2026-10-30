export type TenancyShared = {
    root_domain: string;
    scheme: string;
    login_path: string;
};

export type TenantEstado =
    | 'trial'
    | 'active'
    | 'grace'
    | 'suspended'
    | 'cancelled';

/** Snapshot en `page.props.tenant` (null en dominio central). */
export type TenantShared = {
    id: string;
    slug: string;
    schema?: string;
    razon_social: string;
    nombre_comercial: string | null;
    estado: TenantEstado;
    is_demo?: boolean;
};

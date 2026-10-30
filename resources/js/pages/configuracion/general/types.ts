import type { GeoOption } from '@/components/geo/geo-cascade-fields';

export type IgvAfectacion = 'gravado' | 'exonerado' | 'inafecto';

export type TicketAnchoMm = '56' | '57' | '58' | '80';

export type HorarioDiaKey =
    | 'lun'
    | 'mar'
    | 'mie'
    | 'jue'
    | 'vie'
    | 'sab'
    | 'dom';

export type HorarioDia = {
    abierto: boolean;
    abre: string;
    cierra: string;
};

export type HorarioAtencion = Record<HorarioDiaKey, HorarioDia>;

export type RestaurantSetting = {
    id: string;
    ruc: string | null;
    razon_social: string | null;
    nombre_comercial: string | null;
    direccion_fiscal: string | null;
    distrito_id: number | null;
    distrito_model: {
        id: number;
        name: string;
        provincia_id: number;
        provincia: {
            id: number;
            name: string;
            departamento_id: number;
            departamento: {
                id: number;
                name: string;
            };
        };
    } | null;
    logo_url: string | null;
    email_institucional: string | null;
    telefono_principal: string | null;
    web_url: string | null;
    moneda: 'PEN' | 'USD' | string;
    igv_porcentaje: string;
    igv_alimentos_porcentaje: string;
    igv_afectacion: IgvAfectacion;
    precio_incluye_igv: boolean;
    ticket_ancho_mm: string;
    emite_comprobantes_sunat: boolean;
    horario_atencion: HorarioAtencion;
    updated_at: string | null;
    actualizado_por: {
        id: number;
        name: string;
        email: string;
    } | null;
};

export type ConfiguracionGeneralProps = {
    setting: RestaurantSetting;
    restaurant_header: {
        id: string;
        slug: string;
        razon_social: string | null;
        nombre_comercial: string | null;
    } | null;
    departamentos: readonly GeoOption[];
    plan_permite_factura_electronica: boolean;
    mutations_locked?: boolean;
};

export type GeneralTab = 'identidad' | 'facturacion' | 'horarios';

export { type GeoOption };
